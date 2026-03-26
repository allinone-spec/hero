import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { requirePrivilege } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requirePrivilege("/admin/medals", "canEdit");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Windows can throw EINVAL for direct npm.cmd spawn in some Node/Next contexts.
  // Running through shell is more portable here.
  const child = spawn("npm run import-medals", {
    cwd: process.cwd(),
    env: Object.fromEntries(
      Object.entries(process.env).filter(([, v]) => typeof v === "string"),
    ) as Record<string, string>,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const outputChunks: string[] = [];
  const append = (s: string) => {
    if (!s) return;
    outputChunks.push(s);
    // Keep response payload bounded.
    if (outputChunks.join("").length > 24_000) {
      const merged = outputChunks.join("");
      outputChunks.length = 0;
      outputChunks.push(merged.slice(-24_000));
    }
  };

  child.stdout.on("data", (d) => append(String(d)));
  child.stderr.on("data", (d) => append(String(d)));

  const exitCode = await new Promise<number>((resolve) => {
    const timeout = setTimeout(() => {
      try {
        child.kill("SIGTERM");
      } catch {}
      resolve(124);
    }, 8 * 60 * 1000);
    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve(typeof code === "number" ? code : 1);
    });
  });

  const output = outputChunks.join("").trim();
  if (exitCode !== 0) {
    return NextResponse.json(
      {
        error: "import-medals failed",
        exitCode,
        output: output || "(no output)",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    exitCode,
    output: output || "import-medals completed successfully.",
  });
}

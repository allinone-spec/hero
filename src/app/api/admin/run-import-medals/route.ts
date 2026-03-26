import { NextResponse } from "next/server";
import { exec } from "child_process";
import { requirePrivilege } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requirePrivilege("/admin/medals", "canEdit");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await new Promise<{ ok: boolean; code: number; output: string }>((resolve) => {
    const child = exec(
      "npm run import-medals",
      {
        cwd: process.cwd(),
        env: process.env,
        timeout: 8 * 60 * 1000,
        maxBuffer: 1024 * 1024 * 8, // 8MB output cap
      },
      (error, stdout, stderr) => {
        const output = `${stdout || ""}${stderr || ""}`.trim();
        if (error) {
          const code = typeof (error as NodeJS.ErrnoException & { code?: number | string }).code === "number"
            ? Number((error as NodeJS.ErrnoException & { code?: number | string }).code)
            : 1;
          resolve({ ok: false, code, output });
          return;
        }
        resolve({ ok: true, code: 0, output });
      },
    );
    // keep process from being held open by child handles in some environments
    child.unref();
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: "import-medals failed",
        exitCode: result.code,
        output: result.output || "(no output)",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    exitCode: result.code,
    output: result.output || "import-medals completed successfully.",
  });
}

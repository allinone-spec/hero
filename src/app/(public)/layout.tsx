import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
import DisclaimerModal from "@/components/ui/DisclaimerModal";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DisclaimerModal />
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}

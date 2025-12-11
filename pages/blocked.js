import Link from "next/link";
import Image from "next/image"; // Added missing import
import styles from "../styles/Home.module.css";

export default function Blocked() {
  return (
    <div style={{ 
      backgroundImage: "url('/tartanbackground.png')",
      backgroundColor: "#000",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundAttachment: "fixed",
      minHeight: "100vh",
      fontFamily: "Arial, sans-serif",
      position: "relative"
    }}>
      {/* Header */}
      <header style={{
        padding: "20px 20px 20px 20px",
        backgroundColor: "rgba(215, 61, 128, 0.5)",
        color: "#fff"
      }}>
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 20px",
          display: "flex",
          justifyContent: "flex-start"
        }}>
          <Image
            src="/KILT-Horizontal-white.png"
            alt="KILT Logo"
            width={200}
            height={40}
          />
        </div>
      </header>

      {/* Main Content */}
      <main>
        <div className={styles.container}>
          <div style={{ textAlign: "center", margin: "20px 0" }}>
            {/* Line breaks to shift content down */}
            <br />
            <br />
            <p style={{ fontSize: "32px", fontWeight: "bold", color: "#fff" }}>
              Restricted
            </p>
            <p style={{ fontSize: "24px", color: "#fff" }}>
              <br />
              The migration portal is not available in your region.
            </p>
          </div>
        </div>
      </main>

      {/* Footer without Dashboard */}
      <footer style={{ padding: "10px", textAlign: "center", color: "#666", fontSize: "14px" }}>
        <div>
          <a href="https://www.kilt.io/imprintclaymore" className={styles.footerLink}>Imprint</a>
          {" | "}
          <a href="https://www.kilt.io/privacy-policyclaymore" className={styles.footerLink}>Privacy Policy</a>
          {" | "}
          <a href="https://www.kilt.io/disclaimerclaymore" className={styles.footerLink}>Disclaimer</a>
          {" | "}
          <a href="https://www.kilt.io" className={styles.footerLink}>Homepage</a>
          {" | "}
          <a href="https://skynet.certik.com/projects/kilt-protocol" className={styles.footerLink}>Security Audit</a>
        </div>
      </footer>
    </div>
  );
}

import { useState, useEffect } from "react";
import { ConnectWallet, useNetwork, useAddress, useContract } from "@thirdweb-dev/react";
import Link from "next/link";
import styles from "../styles/Home.module.css";

const OLD_KILT_ABI = [
  {
    constant: true,
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  }
];

const MIGRATION_ABI = [
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "migrate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
];

export default function Home() {
  const [{ data: network }, switchNetwork] = useNetwork();
  const address = useAddress();
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClicked, setIsClicked] = useState(false); // New state for click animation

  const { contract: oldKiltContract, isLoading: contractLoading } = useContract(
    "0x944f601b4b0edb54ad3c15d76cd9ec4c3df7b24b",
    OLD_KILT_ABI
  );
  const { contract: migrationContract } = useContract(
    "0xE9a37BDe0B9dAa20e226608d04AEC6358928c82b",
    MIGRATION_ABI
  );

  useEffect(() => {
    if (network?.chain?.id !== 84532 && switchNetwork) {
      switchNetwork(84532);
    }
  }, [network, switchNetwork]);

  useEffect(() => {
    if (!address || !oldKiltContract) {
      setBalance(null);
      return;
    }

    const fetchBalance = async () => {
      try {
        const bal = await oldKiltContract.call("balanceOf", [address]);
        const balanceValue = bal?._hex ? BigInt(bal._hex) : BigInt(bal);
        const normalized = Number(balanceValue) / 10 ** 18;
        setBalance(normalized);
      } catch (err) {
        console.error("Balance fetch error:", err.message);
        setBalance("Error");
      }
    };

    fetchBalance();
  }, [address, oldKiltContract]);

  const handleApprove = async () => {
    if (!oldKiltContract || !amount || !address) return;
    const weiAmount = BigInt(Math.floor(Number(amount) * 10 ** 18)).toString();
    setIsProcessing(true);
    try {
      const tx = await oldKiltContract.call("approve", [
        "0xE9a37BDe0B9dAa20e226608d04AEC6358928c82b",
        weiAmount
      ]);
      console.log("Approval tx:", tx);
      alert("Approval successful!");
      setIsApproved(true);
    } catch (err) {
      console.error("Approval error:", err.message);
      alert("Approval failed. Check console.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMigrate = async () => {
    if (!migrationContract || !amount || !address) return;
    const weiAmount = BigInt(Math.floor(Number(amount) * 10 ** 18)).toString();
    setIsProcessing(true);
    try {
      const tx = await migrationContract.call("migrate", [weiAmount]);
      console.log("Migration tx:", tx);
      alert("Migration successful!");
      setIsApproved(false);
    } catch (err) {
      console.error("Migration error:", err.message);
      alert("Migration failed. Check console.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleButtonClick = () => {
    setIsClicked(true); // Trigger scale animation
    setTimeout(() => setIsClicked(false), 200); // Reset after 200ms (animation duration)
    if (isApproved) {
      handleMigrate();
    } else {
      handleApprove();
    }
  };

  return (
    <div style={{ 
      backgroundImage: "url('/tartanbackground.png')",
      backgroundColor: "#000",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundAttachment: "fixed",
      minHeight: "100vh",
      fontFamily: "Arial, sans-serif"
    }}>
      <header style={{ padding: "20px", textAlign: "center", backgroundColor: "#D73D80", color: "#fff" }}>
        <img
          src="/KILT-Horizontal-black.png"
          alt="KILT Logo"
          style={{ width: "200px", height: "auto" }}
        />
      </header>

      <main>
        <div className={styles.container}>
          <div style={{ textAlign: "center", margin: "20px 0" }}>
            <p style={{ fontSize: "32px", fontWeight: "bold" }}>Migration Portal</p>
            <p>Migrate KILT on the BASE Network from</p>
            <p style={{ fontSize: "18px" }}><code>0x944f601b4b0edb54ad3c15d76cd9ec4c3df7b24b</code></p>
            <p>to</p>
            <p style={{ fontSize: "18px" }}><code>0x634390EE30d03f26ac8575e830724b349625b65d</code></p>
            <hr style={{ border: "1px solid #D73D80", margin: "20px auto", width: "400px" }} />
            <div style={{
              background: "rgba(19, 87, 187, 0.8)",
              padding: "15px",
              borderRadius: "8px",
              margin: "20px auto",
              width: "200px",
              textAlign: "center",
              color: "#fff"
            }}>
              <div>
                <span style={{ fontWeight: "bold" }}>Migration Ratio</span>
                <br />
                <br />
                <span>1:1.75</span>
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ marginBottom: "2rem" }}>
              <ConnectWallet />
            </div>

            {address ? (
              <div style={{ 
                background: "rgba(19, 87, 187, 0.8)",
                padding: "15px",
                borderRadius: "8px",
                margin: "20px auto",
                width: "500px",
                textAlign: "left"
              }}>
                <div style={{ marginBottom: "10px" }}>
                  <span style={{ fontWeight: "bold", color: "#fff" }}>Wallet: </span>
                  <span style={{ color: "#fff" }}>{address}</span>
                </div>
                <div>
                  <span style={{ fontWeight: "bold", color: "#fff" }}>Balance: </span>
                  <span style={{ color: "#fff" }}>
                    {contractLoading
                      ? "Contract loading..."
                      : balance === null
                      ? "Loading..."
                      : balance === "Error"
                      ? "Failed to load"
                      : `${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} Migrateable KILT`}
                  </span>
                </div>
              </div>
            ) : (
              <p>Connect your wallet to view balance.</p>
            )}

            <div style={{ margin: "20px 0" }}>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                style={{ margin: "10px", padding: "8px", width: "200px" }}
              />
              <div style={{ display: "flex", justifyContent: "center" }}>
                <button
                  onClick={handleButtonClick}
                  disabled={!amount || !address || isProcessing}
                  className={styles.card}
                  style={{
                    margin: "10px",
                    padding: "10px 20px",
                    width: "180px",
                    backgroundColor: isApproved ? "#D73D80" : "#DAF525",
                    fontSize: "18px",
                    fontWeight: isApproved ? "bold" : "normal",
                    textAlign: "center",
                    transition: "transform 0.2s ease-in-out", // Smooth scale animation
                    transform: isClicked ? "scale(0.95)" : "scale(1)", // Click scale
                    position: "relative",
                    color: "#fff",
                    border: "none",
                    cursor: isProcessing ? "not-allowed" : "pointer"
                  }}
                >
                  {isProcessing ? (
                    <span
                      style={{
                        display: "inline-block",
                        width: "20px",
                        height: "20px",
                        border: `3px solid ${isApproved ? "#fff" : "#000"}`,
                        borderTop: "3px solid transparent",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)"
                      }}
                    />
                  ) : (
                    isApproved ? "Migrate" : "Approve"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer style={{ padding: "10px", textAlign: "center", color: "#666", fontSize: "14px" }}>
        <div>
          <div style={{ marginBottom: "10px" }}>
            <Link
              href="/dashboard"
              className={styles.footerLink2}
              style={{ fontSize: "28px" }}
            >
              →Dashboard
            </Link>
          </div>
          <a href="https://www.kilt.io/imprint" className={styles.footerLink}>Imprint</a>
          {" | "}
          <a href="https://www.kilt.io/privacy-policy" className={styles.footerLink}>Privacy Policy</a>
          {" | "}
          <a href="https://www.kilt.io/disclaimer" className={styles.footerLink}>Disclaimer</a>
          {" | "}
          <a href="https://www.kilt.io" className={styles.footerLink}>Homepage</a>
          {" | "}
          <a href="https://www.kilt.io" className={styles.footerLink}>Security Audit</a>
        </div>
      </footer>

      <style jsx>{`
        @keyframes spin {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

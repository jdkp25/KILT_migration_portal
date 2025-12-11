import { useState, useEffect, useRef } from "react";
import { ConnectWallet, useAddress, useContract, useNetworkMismatch, useSwitchChain } from "@thirdweb-dev/react";
import Link from "next/link";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import styles from "../styles/Home.module.css";
const OLD_KILT_ABI = [
  { constant: true, inputs: [{ name: "owner", type: "address" }], name: "balanceOf", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { constant: false, inputs: [{ name: "spender", type: "address" }, { name: "value", type: "uint256" }], name: "approve", outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { constant: true, inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], name: "allowance", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }
];
const MIGRATION_ABI = [
  { constant: true, inputs: [], name: "BURN_ADDRESS", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  { constant: true, inputs: [], name: "EXCHANGE_RATE_NUMERATOR", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { constant: true, inputs: [], name: "EXCHANGE_RATE_DENOMINATOR", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { constant: true, inputs: [], name: "isMigrationActive", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { constant: true, inputs: [], name: "newToken", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  { constant: true, inputs: [], name: "oldToken", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  { constant: true, inputs: [], name: "paused", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { constant: true, inputs: [{ name: "addr", type: "address" }], name: "whitelist", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { constant: false, inputs: [{ name: "amount", type: "uint256" }], name: "migrate", outputs: [], stateMutability: "nonpayable", type: "function" }
];
export default function Home() {
  const address = useAddress();
  const switchChain = useSwitchChain();
  const isNetworkMismatch = useNetworkMismatch();
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState(null);
  const [newBalance, setNewBalance] = useState(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [isChecked, setIsChecked] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [termsContent, setTermsContent] = useState("Loading terms...");
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });
  const scrollRef = useRef(null);
  const { contract: oldKiltContract, isLoading: contractLoading } = useContract(
    "0x9E5189a77f698305Ef76510AFF1C528cff48779c",
    OLD_KILT_ABI
  );
  const { contract: newKiltContract } = useContract(
    "0x5D0DD05bB095fdD6Af4865A1AdF97c39C85ad2d8",
    OLD_KILT_ABI
  );
  const { contract: migrationContract } = useContract(
    "0x4A62F30d95a8350Fc682642A455B299C074B3B8c",
    MIGRATION_ABI
  );
  useEffect(() => {
    console.log("Network mismatch status:", isNetworkMismatch);
  }, [isNetworkMismatch]);
  const fetchBalance = async () => {
    if (!address || !oldKiltContract) {
      setBalance(null);
      return;
    }
    try {
      const bal = await oldKiltContract.call("balanceOf", [address]);
      const balanceValue = bal?._hex ? BigInt(bal._hex) : BigInt(bal);
      const normalized = Number(balanceValue) / 10 ** 15;
      setBalance(normalized);
    } catch (err) {
      console.error("Balance fetch error:", err.message);
      setBalance("Error");
    }
  };
const fetchNewBalance = async () => {
  if (!address || !newKiltContract) {
    setNewBalance(null);
    return;
  }
  try {
    const bal = await newKiltContract.call("balanceOf", [address]);
    const balanceValue = bal?._hex ? BigInt(bal._hex) : BigInt(bal);
    const normalized = Number(balanceValue) / 10 ** 18;
    setNewBalance(normalized);
  } catch (err) {
    console.error("New balance fetch error:", err.message);
    setNewBalance("Error");
  }
};
  useEffect(() => {
    fetchBalance();
    fetchNewBalance();
  }, [address, oldKiltContract, newKiltContract]);
  useEffect(() => {
    const handleScroll = () => {
      const element = scrollRef.current;
      if (element) {
        const isBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 1;
        setScrolledToBottom(isBottom);
      }
    };
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener("scroll", handleScroll);
      return () => scrollElement.removeEventListener("scroll", handleScroll);
    }
  }, []);
  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const response = await fetch("/terms.md");
        if (!response.ok) throw new Error("Failed to fetch terms");
        const text = await response.text();
        setTermsContent(text);
      } catch (err) {
        console.error("Failed to load terms:", err);
        setTermsContent("Failed to load terms and conditions.");
      }
    };
    fetchTerms();
  }, []);
  useEffect(() => {
    if (!oldKiltContract || !address || !amount || Number(amount) <= 0) {
      setIsApproved(false);
      return;
    }
    const checkAllowance = async () => {
      try {
        const allowance = await oldKiltContract.call("allowance", [
          address,
          "0x4A62F30d95a8350Fc682642A455B299C074B3B8c"
        ]);
        const weiAmount = BigInt(Math.floor(Number(amount) * 10 ** 15));
        setIsApproved(BigInt(allowance) >= weiAmount);
      } catch (err) {
        console.error("Allowance check error:", err.message);
        setIsApproved(false);
      }
    };
    checkAllowance();
  }, [address, oldKiltContract, amount]);
  const handleApprove = async () => {
    if (!oldKiltContract || !amount || !address) return;
    const weiAmount = BigInt(Math.floor(Number(amount) * 10 ** 15)).toString();
    setIsProcessing(true);
    try {
      const tx = await oldKiltContract.call("approve", [
        "0x4A62F30d95a8350Fc682642A455B299C074B3B8c",
        weiAmount
      ]);
      console.log("Approval tx:", tx);
      await fetchBalance();
      alert("Approval successful!");
      setIsApproved(true);
    } catch (err) {
      console.error("Approval error:", err.message);
      alert("Approval failed: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };
  const handleMigrate = async () => {
    if (!migrationContract || !amount || !address) return;
    const weiAmount = BigInt(Math.floor(Number(amount) * 10 ** 15)).toString();
    setIsProcessing(true);
    try {
      const tx = await migrationContract.call("migrate", [weiAmount]);
      console.log("Migration tx:", tx);
      await fetchBalance();
      await fetchNewBalance();
      alert("Migration successful!");
      setIsApproved(false);
    } catch (err) {
      console.error("Migration error:", err.message);
      if (err.message.includes("Insufficient allowance")) {
        alert("Please approve the amount first.");
      } else if (err.message.includes("Pausable: paused")) {
        alert("Migration is paused. Please try later.");
      } else {
        alert("Migration failed: " + err.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };
  const handleButtonClick = (e) => {
    if (Number(amount) <= 0 || Number(amount) > balance) {
      alert("Amount must be positive and less than or equal to your balance.");
      return;
    }
    e.currentTarget.classList.remove("bounce");
    void e.currentTarget.offsetWidth;
    e.currentTarget.classList.add("bounce");
    if (isApproved) {
      handleMigrate();
    } else {
      handleApprove();
    }
  };
  const handleProceed = () => {
    if (isChecked && scrolledToBottom) {
      setShowOverlay(false);
    }
  };
  const handleCheckboxChange = (e) => {
    if (scrolledToBottom) {
      setIsChecked(e.target.checked);
    }
  };
  const handleSwitchNetwork = async () => {
    if (switchChain) {
      try {
        await switchChain(8453);
        console.log("Switched to Base (8453)");
      } catch (err) {
        console.error("Network switch error:", err.message);
        alert("Failed to switch network: " + err.message);
      }
    }
  };
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const closing = new Date('2025-08-28T12:00:00Z');
      const difference = closing - now;
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        return { days, hours, minutes };
      } else {
        return { days: 0, hours: 0, minutes: 0 };
      }
    };
    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000);
    return () => clearInterval(timer);
  }, []);
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
      {showOverlay && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          zIndex: 1000,
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        }}>
          <div style={{
            backgroundColor: "#fff",
            padding: "20px",
            borderRadius: "8px",
            width: "500px",
            maxWidth: "90%",
            textAlign: "center"
          }}>
            <h2 style={{ marginBottom: "20px", color: "#000" }}>
              Terms and Conditions of Use
            </h2>
            <div
              ref={scrollRef}
              style={{
                maxHeight: "200px",
                overflowY: "auto",
                border: "1px solid #ccc",
                padding: "10px",
                marginBottom: "20px",
                textAlign: "left",
                color: "#000"
              }}
            >
              <ReactMarkdown>{termsContent}</ReactMarkdown>
            </div>
            <div style={{
              marginBottom: "20px",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <input
                type="checkbox"
                checked={isChecked}
                onChange={handleCheckboxChange}
                disabled={!scrolledToBottom}
                style={{ marginRight: "10px" }}
              />
              <label style={{ color: "#000" }}>I agree</label>
            </div>
            <button
              onClick={handleProceed}
              disabled={!isChecked || !scrolledToBottom}
              style={{
                padding: "10px 20px",
                backgroundColor: isChecked && scrolledToBottom ? "#D73D80" : "#ccc",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: isChecked && scrolledToBottom ? "pointer" : "not-allowed",
                fontSize: "16px",
                opacity: isChecked && scrolledToBottom ? 1 : 0.6
              }}
            >
              Proceed
            </button>
          </div>
        </div>
      )}
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
      style={{ height: "auto" }}
    />
  </div>
</header>
      <main style={{ display: "flex", maxWidth: "1200px", margin: "20px auto", padding: "0 20px" }}>
{/* Left Column */}
<div style={{ flex: "1", paddingRight: "20px", textAlign: "left", color: "#fff" }}>
  <p style={{ fontSize: "32px", fontWeight: "bold" }}>KILT Token Migration</p>
  <p>KILT is migrating to a new contract on Base.</p>
  <p>The migration window will open at 1200 UTC on Thursday June 19th and remain open for 10 weeks, closing at 1200 UTC on Thursday August 28th. All holders must migrate their tokens within this timeframe or their tokens will be lost.
  This portal allows you to migrate your tokens from the old Base contract to the new Base contract. Tokens on Polkadot or Ethereum must first be bridged to Base, as detailed in the <Link href="https://medium.com/kilt-protocol/kilt-token-migration-guide-4ae8a5b686d6" style={{ color: "#fff", textDecoration: "underline" }}>Migration Guide</Link>.</p>
  <p>Before using this portal, please carefully read the <Link href="https://medium.com/kilt-protocol/kilt-token-migration-guide-4ae8a5b686d6" style={{ color: "#fff", textDecoration: "underline" }}>Migration Guide</Link> in full.</p>
  <div style={{
    background: "rgba(215, 61, 128, 0.5)",
    padding: "20px",
    borderRadius: "8px",
    marginTop: "20px",
    textAlign: "center"
  }}>
    <h2 style={{ color: "#fff", marginBottom: "10px" }}>The migration window closes in:</h2>
    <p style={{ fontSize: "48px", fontWeight: "bold", color: "#fff" }}>
      {timeLeft.days}d : {timeLeft.hours}h : {timeLeft.minutes}m
    </p>
    <p style={{ fontSize: "24px", color: "#fff" }}>
      at 1200 UTC, August 28th
    </p>
  </div>
</div>
{/* Right Column */}
<br /><br />
<div style={{ flex: "1", paddingLeft: "20px" }}>
  <div style={{
    background: "rgba(19, 87, 187, 0.8)",
    padding: "20px",
    borderRadius: "8px",
    textAlign: "center",
    color: "#fff",
    position: "relative",
    marginTop: "20px"
  }}>
    <div style={{
      position: "absolute",
      top: "20px",
      left: "20px",
      fontSize: "32px",
      fontWeight: "bold",
      color: "#fff"
    }}>
      Migration Portal
    </div>
    <div style={{ position: "absolute", top: "20px", right: "20px" }}>
      <ConnectWallet />
    </div>
    {address && isNetworkMismatch && (
      <div style={{
        background: "#D73D80",
        padding: "15px",
        borderRadius: "8px",
        margin: "20px 0",
        textAlign: "center",
        color: "#fff"
      }}>
        <p style={{ fontWeight: "bold" }}>
          Wrong Network Detected
        </p>
        <p>
          Please switch to Base (Chain ID: 8453) to proceed with migration.
        </p>
        <button
          onClick={handleSwitchNetwork}
          style={{
            margin: "10px",
            padding: "10px 20px",
            backgroundColor: "#DAF525",
            color: "#000",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "16px"
          }}
        >
          Switch to Base
        </button>
      </div>
    )}
    <br />
     
    <div style={{
      background: "#fff",
      margin: "80px 10px 20px 10px",
      padding: "8px",
      borderRadius: "8px",
      height: "72px",
      position: "relative",
      color: "#000",
      textAlign: "left",
      display: "flex",
      alignItems: "center"
    }}>
      <div style={{ position: "absolute", left: "10px" }}>
        <span style={{ fontWeight: "bold" }}>Old KILT</span>
        <span> (0x9E51...779c)</span>
      </div>
      <input
        type="number"
        min="0"
        value={amount}
        onChange={(e) => {
          const value = e.target.value;
          if (value === "" || Number(value) >= 0) {
            setAmount(value);
          }
        }}
        placeholder="0"
        style={{
          position: "absolute",
          right: "10px",
          width: "200px",
          padding: "8px",
          border: "none",
          outline: "none",
          textAlign: "right",
          fontWeight: "bold",
          fontSize: "16px",
          background: "transparent",
          appearance: "textfield",
          MozAppearance: "textfield",
          WebkitAppearance: "none"
        }}
      />
    </div>
    <div style={{ textAlign: "right", marginTop: "5px", marginRight: "20px" }}>
      {address && (
        <button
          onClick={(e) => {
            if (balance && balance !== "Error") {
              setAmount(balance.toString());
              e.currentTarget.classList.remove("bounce");
              void e.currentTarget.offsetWidth;
              e.currentTarget.classList.add("bounce");
            }
          }}
          className={styles.card}
          style={{
            display: "inline-block",
            marginRight: "10px",
            padding: "5px 10px",
            backgroundColor: "#DAF525",
            color: "#000",
            border: "none",
            borderRadius: "4px",
            fontSize: "14px",
            cursor: balance && balance !== "Error" ? "pointer" : "not-allowed",
            opacity: balance && balance !== "Error" ? 1 : 0.6
          }}
        >
          Max
        </button>
      )}
      <span style={{ fontWeight: "bold", color: "#fff" }}>Balance: </span>
      <span style={{ color: "#fff", fontWeight: "normal", fontSize: "16px" }}>
        {address ? (
          contractLoading
            ? "Loading..."
            : balance === null
            ? "0.0"
            : balance === "Error"
            ? "Failed"
            : `${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ) : (
          "Connect wallet to view balance"
        )}
      </span>
    </div>
    <br />
    <div style={{
      textAlign: "center",
      margin: "10px 0",
      fontWeight: "bold",
      color: "#fff"
    }}>
      Migration Ratio: 1 to 1.75
    </div>
<svg width="24" height="24" viewBox="0 0 24 38" fill="none" stroke="#fff" strokeWidth="3">
    <path d="M12 5v28M5 26l7 7 7-7"/>
  </svg>
 
    <div style={{
      background: "#fff",
      margin: "20px 10px",
      padding: "8px",
      borderRadius: "8px",
      height: "72px",
      position: "relative",
      color: "#000",
      textAlign: "left",
      display: "flex",
      alignItems: "center"
    }}>
      <div style={{ position: "absolute", left: "10px" }}>
        <span style={{ fontWeight: "bold" }}>New KILT</span>
        <span> (0x5d0d...d2d8)</span>
      </div>
      <div style={{
        position: "absolute",
        right: "10px",
        width: "200px",
        padding: "8px",
        textAlign: "right",
        fontWeight: "bold",
        fontSize: "16px"
      }}>
        {amount && Number(amount) > 0
          ? (Number(amount) * 1.75).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })
          : "0.0"}
      </div>
    </div>
    <div style={{ textAlign: "right", marginTop: "5px", marginRight: "20px" }}>
      <span style={{ fontWeight: "bold", color: "#fff" }}>
        Balance: </span>
      <span style={{ color: "#fff", fontWeight: "normal", fontSize: "16px" }}>
        {address ? (
          contractLoading
            ? "Loading..."
            : newBalance === null
            ? "0.0"
            : newBalance === "Error"
              ? "Failed"
              : `${newBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          ) : (
            "Connect wallet to view balance"
          )}
      </span>
    </div>
    <div style={{ margin: "20px 0" }}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button
          onClick={handleButtonClick}
          disabled={!amount || !address || isProcessing || isNetworkMismatch}
          className={styles.card}
          style={{
            margin: "10px",
            padding: "10px 20px",
            width: "180px",
            height: "40px",
            backgroundColor: isApproved ? "#D73D80" : "#DAF525",
            fontSize: "18px",
            fontWeight: isApproved ? "bold" : "normal",
            textAlign: "center",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
            opacity: !amount || !address || isProcessing || isNetworkMismatch ? 0.6 : 1,
            cursor: !amount || !address || isProcessing || isNetworkMismatch ? "not-allowed" : "pointer"
          }}
        >
          {isProcessing ? (
            <span style={{
              display: "inline-block",
              width: "20px",
              height: "20px",
              border: `3px solid ${isApproved ? "#fff" : "#000"}`,
              borderTop: "3px solid transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }} />
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
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0% { transform: scale(1); }
          50% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        .bounce {
          animation: bounce 0.2s ease-in-out;
        }
      `}</style>
    </div>
  );
}

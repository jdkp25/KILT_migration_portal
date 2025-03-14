import { useState, useEffect } from "react";
import { useContract } from "@thirdweb-dev/react";
import Link from "next/link";
import styles from "../styles/Home.module.css";

const MIGRATION_ABI = [
  {
    constant: true,
    inputs: [],
    name: "BURN_ADDRESS",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "EXCHANGE_RATE_NUMERATOR",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "EXCHANGE_RATE_DENOMINATOR",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "isMigrationActive",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "newToken",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "oldToken",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "paused",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "addr", type: "address" }],
    name: "whitelist",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  }
];

const OLD_KILT_ABI = [
  {
    constant: true,
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
];

export default function Dashboard() {
  const [burnAddress, setBurnAddress] = useState(null);
  const [exchangeRateNumerator, setExchangeRateNumerator] = useState(null);
  const [exchangeRateDenominator, setExchangeRateDenominator] = useState(null);
  const [isMigrationActive, setIsMigrationActive] = useState(null);
  const [newToken, setNewToken] = useState(null);
  const [oldToken, setOldToken] = useState(null);
  const [isPaused, setIsPaused] = useState(null); // New state for paused
  const [whitelistAddress, setWhitelistAddress] = useState("");
  const [whitelistResult, setWhitelistResult] = useState(null);
  const [burnAddressBalance, setBurnAddressBalance] = useState(null);
  const [burnAddressBalanceError, setBurnAddressBalanceError] = useState(null);

  const TOTAL_KILT_SUPPLY = 164000000; // Hardcoded total supply

  const { contract: migrationContract, isLoading: migrationLoading } = useContract(
    "0xE9a37BDe0B9dAa20e226608d04AEC6358928c82b",
    MIGRATION_ABI
  );
  const { contract: oldKiltContract, isLoading: oldKiltLoading } = useContract(
    "0x944f601b4b0edb54ad3c15d76cd9ec4c3df7b24b",
    OLD_KILT_ABI
  );

  const fetchContractData = async () => {
    if (!migrationContract) return;

    try {
      const burnAddr = await migrationContract.call("BURN_ADDRESS");
      setBurnAddress(burnAddr);

      const numerator = await migrationContract.call("EXCHANGE_RATE_NUMERATOR");
      setExchangeRateNumerator(numerator.toString());

      const denominator = await migrationContract.call("EXCHANGE_RATE_DENOMINATOR");
      setExchangeRateDenominator(denominator.toString());

      const migrationActive = await migrationContract.call("isMigrationActive");
      setIsMigrationActive(migrationActive);

      const newTok = await migrationContract.call("newToken");
      setNewToken(newTok);

      const oldTok = await migrationContract.call("oldToken");
      setOldToken(oldTok);

      const paused = await migrationContract.call("paused");
      setIsPaused(paused);
    } catch (err) {
      console.error("Data fetch error:", err.message);
      setBurnAddress("Error");
      setExchangeRateNumerator("Error");
      setExchangeRateDenominator("Error");
      setIsMigrationActive("Error");
      setNewToken("Error");
      setOldToken("Error");
      setIsPaused("Error");
    }
  };

  const fetchWhitelistStatus = async () => {
    if (!migrationContract || !whitelistAddress) return;

    try {
      const result = await migrationContract.call("whitelist", [whitelistAddress]);
      setWhitelistResult(result.toString());
    } catch (err) {
      console.error("Whitelist fetch error:", err.message);
      setWhitelistResult("Error");
    }
  };

  const fetchBurnAddressBalance = async () => {
    if (!migrationContract || !oldKiltContract || burnAddress === null) {
      setBurnAddressBalance(null);
      setBurnAddressBalanceError(null);
      return;
    }

    try {
      const bal = await oldKiltContract.call("balanceOf", [burnAddress]);
      const balanceValue = bal?._hex ? BigInt(bal._hex) : BigInt(bal);
      const normalized = Number(balanceValue) / 10 ** 18;
      setBurnAddressBalance(normalized);
      setBurnAddressBalanceError(null);
    } catch (err) {
      console.error("Burn address balance fetch error:", err.message);
      setBurnAddressBalance("Error");
      setBurnAddressBalanceError(err.message);
    }
  };

  useEffect(() => {
    fetchContractData();
  }, [migrationContract]);

  useEffect(() => {
    if (burnAddress && burnAddress !== "Error") {
      fetchBurnAddressBalance();
    }
  }, [migrationContract, oldKiltContract, burnAddress]);

  const calculatePercentage = () => {
    if (burnAddressBalance === null || burnAddressBalance === "Error") return "N/A";
    const percentage = (burnAddressBalance / TOTAL_KILT_SUPPLY) * 100;
    return percentage.toFixed(2);
  };

  return (
    <div style={{ 
      backgroundImage: "url('/tartanbackground.png')",
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

      <main className={styles.main}>
        <div className={styles.container}>
          <div style={{ textAlign: "center", margin: "20px 0" }}>
            <p style={{ fontSize: "32px", fontWeight: "bold" }}>Migration Dashboard</p>

            {/* Migration Progress Card */}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "20px 0" }}>
              <div style={{
                background: "rgba(19, 87, 187, 0.65)",
                padding: "15px",
                borderRadius: "8px",
                width: "500px",
                textAlign: "left",
                color: "#fff"
              }}>
                <div>
                  <span style={{ fontWeight: "bold" }}>Migration Progress: </span>
                  <span>
                    {oldKiltLoading || migrationLoading
                      ? "Contract loading..."
                      : burnAddressBalance === null
                      ? "Loading..."
                      : burnAddressBalance === "Error"
                      ? "Failed to load"
                      : `${burnAddressBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} KILT / ${calculatePercentage()}%`}
                  </span>
                </div>
              </div>
              <button
                onClick={fetchBurnAddressBalance}
                className={styles.card}
                style={{ marginLeft: "10px", padding: "10px 20px" }}
              >
                Query
              </button>
            </div>

            {/* Migration Contract (not a card) */}
            <p style={{ color: "#fff" }}>
              <span style={{ fontWeight: "bold" }}>Migration Contract: </span>
              0xe9a37bde0b9daa20e226608d04aec6358928c82b
            </p>
          </div>

          {migrationLoading && <p style={{ textAlign: "center", color: "#fff" }}>Loading contract...</p>}

          {/* newToken Card */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "20px 0" }}>
            <div style={{
              background: "rgba(19, 87, 187, 0.65)",
              padding: "15px",
              borderRadius: "8px",
              width: "500px",
              textAlign: "left",
              color: "#fff"
            }}>
              <div>
                <span style={{ fontWeight: "bold" }}>newToken: </span>
                <span>
                  {newToken === null
                    ? "Loading..."
                    : newToken === "Error"
                    ? "Failed to load"
                    : newToken}
                </span>
              </div>
            </div>
            <button
              onClick={fetchContractData}
              className={styles.card}
              style={{ marginLeft: "10px", padding: "10px 20px" }}
            >
              Query
            </button>
          </div>

          {/* oldToken Card */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "20px 0" }}>
            <div style={{
              background: "rgba(19, 87, 187, 0.65)",
              padding: "15px",
              borderRadius: "8px",
              width: "500px",
              textAlign: "left",
              color: "#fff"
            }}>
              <div>
                <span style={{ fontWeight: "bold" }}>oldToken: </span>
                <span>
                  {oldToken === null
                    ? "Loading..."
                    : oldToken === "Error"
                    ? "Failed to load"
                    : oldToken}
                </span>
              </div>
            </div>
            <button
              onClick={fetchContractData}
              className={styles.card}
              style={{ marginLeft: "10px", padding: "10px 20px" }}
            >
              Query
            </button>
          </div>

          {/* EXCHANGE_RATE_NUMERATOR Card */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "20px 0" }}>
            <div style={{
              background: "rgba(19, 87, 187, 0.65)",
              padding: "15px",
              borderRadius: "8px",
              width: "500px",
              textAlign: "left",
              color: "#fff"
            }}>
              <div>
                <span style={{ fontWeight: "bold" }}>EXCHANGE_RATE_NUMERATOR: </span>
                <span>
                  {exchangeRateNumerator === null
                    ? "Loading..."
                    : exchangeRateNumerator === "Error"
                    ? "Failed to load"
                    : exchangeRateNumerator}
                </span>
              </div>
            </div>
            <button
              onClick={fetchContractData}
              className={styles.card}
              style={{ marginLeft: "10px", padding: "10px 20px" }}
            >
              Query
            </button>
          </div>

          {/* EXCHANGE_RATE_DENOMINATOR Card */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "20px 0" }}>
            <div style={{
              background: "rgba(19, 87, 187, 0.65)",
              padding: "15px",
              borderRadius: "8px",
              width: "500px",
              textAlign: "left",
              color: "#fff"
            }}>
              <div>
                <span style={{ fontWeight: "bold" }}>EXCHANGE_RATE_DENOMINATOR: </span>
                <span>
                  {exchangeRateDenominator === null
                    ? "Loading..."
                    : exchangeRateDenominator === "Error"
                    ? "Failed to load"
                    : exchangeRateDenominator}
                </span>
              </div>
            </div>
            <button
              onClick={fetchContractData}
              className={styles.card}
              style={{ marginLeft: "10px", padding: "10px 20px" }}
            >
              Query
            </button>
          </div>

          {/* isMigrationActive Card */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "20px 0" }}>
            <div style={{
              background: "rgba(19, 87, 187, 0.65)",
              padding: "15px",
              borderRadius: "8px",
              width: "500px",
              textAlign: "left",
              color: "#fff"
            }}>
              <div>
                <span style={{ fontWeight: "bold" }}>isMigrationActive: </span>
                <span>
                  {isMigrationActive === null
                    ? "Loading..."
                    : isMigrationActive === "Error"
                    ? "Failed to load"
                    : isMigrationActive.toString()}
                </span>
              </div>
            </div>
            <button
              onClick={fetchContractData}
              className={styles.card}
              style={{ marginLeft: "10px", padding: "10px 20px" }}
            >
              Query
            </button>
          </div>

          {/* paused Card */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "20px 0" }}>
            <div style={{
              background: "rgba(19, 87, 187, 0.65)",
              padding: "15px",
              borderRadius: "8px",
              width: "500px",
              textAlign: "left",
              color: "#fff"
            }}>
              <div>
                <span style={{ fontWeight: "bold" }}>paused: </span>
                <span>
                  {isPaused === null
                    ? "Loading..."
                    : isPaused === "Error"
                    ? "Failed to load"
                    : isPaused.toString()}
                </span>
              </div>
            </div>
            <button
              onClick={fetchContractData}
              className={styles.card}
              style={{ marginLeft: "10px", padding: "10px 20px" }}
            >
              Query
            </button>
          </div>

          {/* Check Whitelist Card */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "20px 0" }}>
            <div style={{
              background: "rgba(19, 87, 187, 0.65)",
              padding: "15px",
              borderRadius: "8px",
              width: "500px",
              textAlign: "left",
              color: "#fff"
            }}>
              <div>
                <span style={{ fontWeight: "bold" }}>Check Whitelist: </span>
                <input
                  type="text"
                  value={whitelistAddress}
                  onChange={(e) => setWhitelistAddress(e.target.value)}
                  placeholder="Enter address"
                  style={{ marginLeft: "10px", padding: "5px", width: "250px" }}
                />
                <span style={{ marginLeft: "10px" }}>
                  {whitelistResult === null
                    ? ""
                    : whitelistResult === "Error"
                    ? "Failed to load"
                    : whitelistResult}
                </span>
              </div>
            </div>
            <button
              onClick={fetchWhitelistStatus}
              className={styles.card}
              style={{ marginLeft: "10px", padding: "10px 20px" }}
            >
              Query
            </button>
          </div>
        </div>
      </main>

      <footer style={{ padding: "10px", textAlign: "center", color: "#666", fontSize: "14px" }}>
        <div>
          <div style={{ marginBottom: "10px" }}>
            <Link
              href="/"
              className={styles.footerLink}
              style={{ color: "#fff", fontSize: "28px" }}
            >
              →Portal
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
    </div>
  );
}

export async function getServerSideProps() {
  return {
    props: {},
  };
}

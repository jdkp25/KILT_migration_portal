import { useState, useEffect } from "react"; // React hooks for state and lifecycle management
import { useContract } from "@thirdweb-dev/react"; // Thirdweb hook for smart contract interaction
import Link from "next/link"; // Next.js component for client-side navigation
import styles from "../styles/Home.module.css"; // CSS module for shared styles
import Image from "next/image"

// ABI for the migration contract, defining its view functions
const MIGRATION_ABI = [
  { constant: true, inputs: [], name: "BURN_ADDRESS", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  { constant: true, inputs: [], name: "EXCHANGE_RATE_NUMERATOR", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { constant: true, inputs: [], name: "EXCHANGE_RATE_DENOMINATOR", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { constant: true, inputs: [], name: "isMigrationActive", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { constant: true, inputs: [], name: "newToken", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  { constant: true, inputs: [], name: "oldToken", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  { constant: true, inputs: [], name: "paused", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { constant: true, inputs: [{ name: "addr", type: "address" }], name: "whitelist", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" }
];

// ABI for the old KILT token contract, used to check balances
const OLD_KILT_ABI = [
  { constant: true, inputs: [{ name: "owner", type: "address" }], name: "balanceOf", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }
];

// Main Dashboard component
export default function Dashboard() {
  // State variables for storing contract data
  const [burnAddress, setBurnAddress] = useState(null); // Address where old tokens are burned
  const [exchangeRateNumerator, setExchangeRateNumerator] = useState(null); // Numerator of the migration exchange rate (e.g., 175 for 1:1.75)
  const [exchangeRateDenominator, setExchangeRateDenominator] = useState(null); // Denominator of the exchange rate (e.g., 100)
  const [isMigrationActive, setIsMigrationActive] = useState(null); // Boolean indicating if migration is ongoing
  const [newToken, setNewToken] = useState(null); // Address of the new KILT token
  const [oldToken, setOldToken] = useState(null); // Address of the old KILT token
  const [isPaused, setIsPaused] = useState(null); // Boolean indicating if migration is paused
  const [whitelistAddress, setWhitelistAddress] = useState(""); // User-input address to check whitelist status
  const [whitelistResult, setWhitelistResult] = useState(null); // Result of whitelist check (true/false)
  const [burnAddressBalance, setBurnAddressBalance] = useState(null); // Balance of old tokens at burn address
  const [hasFetched, setHasFetched] = useState(false); // Flag to ensure fetch runs only once initially

  // Constant for total KILT supply, used to calculate migration progress percentage
  const TOTAL_KILT_SUPPLY = 164000000;

  // Thirdweb hooks to connect to the smart contracts
  const { contract: migrationContract, isLoading: migrationLoading } = useContract(
    "0x4A62F30d95a8350Fc682642A455B299C074B3B8c", // Migration contract address
    MIGRATION_ABI
  );
  const { contract: oldKiltContract, isLoading: oldKiltLoading } = useContract(
    "0x9E5189a77f698305Ef76510AFF1C528cff48779c", // Old KILT token address
    OLD_KILT_ABI
  );

  // Function to fetch all contract data except whitelist status
  const fetchAllData = async () => {
    console.log("fetchAllData triggered at:", new Date().toISOString());
    // Ensure both contracts are loaded before fetching
    if (!migrationContract || !oldKiltContract) {
      console.log("Contracts not ready, skipping fetchAllData");
      return;
    }

    // Mark that we've attempted to fetch
    setHasFetched(true);

    // Helper function to handle individual contract calls with retries and error handling
    const callContract = async (setter, currentValue, contract, method, args = [], retries = 3) => {
      // Skip if the current value is already successfully loaded (not null or "Error")
      if (currentValue !== null && currentValue !== "Error") {
        console.log(`Skipping ${method} as it already has value:`, currentValue);
        return currentValue;
      }

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const result = await contract.call(method, args);
          setter(result); // Set the state with the result
          console.log(`Success for ${method} on attempt ${attempt}:`, result);
          return result;
        } catch (err) {
          console.error(`Attempt ${attempt} failed for ${method}:`, err.message);
          if (attempt === retries) {
            console.error(`All ${retries} attempts failed for ${method}`);
            setter("Error"); // Set error state after all retries fail
            return null; // Return null to indicate failure
          }
          // Wait 1 second before retrying
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    };

    // Delay function to space out calls
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // Fetch each piece of data independently with delays
    const burnAddr = await callContract(setBurnAddress, burnAddress, migrationContract, "BURN_ADDRESS");
    await delay(1000);

    await callContract(
      setExchangeRateNumerator,
      exchangeRateNumerator,
      migrationContract,
      "EXCHANGE_RATE_NUMERATOR"
    ).then((result) => result && setExchangeRateNumerator(result.toString()));
    await delay(1000);

    await callContract(
      setExchangeRateDenominator,
      exchangeRateDenominator,
      migrationContract,
      "EXCHANGE_RATE_DENOMINATOR"
    ).then((result) => result && setExchangeRateDenominator(result.toString()));
    await delay(1000);

    await callContract(setIsMigrationActive, isMigrationActive, migrationContract, "isMigrationActive");
    await delay(1000);

    await callContract(setNewToken, newToken, migrationContract, "newToken");
    await delay(1000);

    await callContract(setOldToken, oldToken, migrationContract, "oldToken");
    await delay(1000);

    await callContract(setIsPaused, isPaused, migrationContract, "paused");
    await delay(1000);

    // Fetch burn address balance only if burn address was successfully fetched
    if (burnAddr && burnAddr !== "Error") {
      await callContract(
        setBurnAddressBalance,
        burnAddressBalance,
        oldKiltContract,
        "balanceOf",
        [burnAddr]
      ).then((result) => {
        if (result) {
          const balanceValue = result?._hex ? BigInt(result._hex) : BigInt(result);
          const normalized = Number(balanceValue) / 10 ** 15; // Convert from wei
          setBurnAddressBalance(normalized);
        }
      });
    } else {
      setBurnAddressBalance("Error");
    }
  };

  // Function to check if an address is whitelisted
  const fetchWhitelistStatus = async () => {
    // Skip if no contract or empty address input
    if (!migrationContract || !whitelistAddress) return;

    try {
      // Call whitelist function with user-provided address
      const result = await migrationContract.call("whitelist", [whitelistAddress]);
      setWhitelistResult(result.toString()); // Convert boolean to string for display
    } catch (err) {
      // Log error and show "Error" to user
      console.error("Whitelist fetch error:", err.message);
      setWhitelistResult("Error");
    }
  };

  // Handler for button clicks to trigger bounce animation and fetch function
  const handleButtonClick = (e, fetchFunction) => {
    // Remove bounce class to reset animation
    e.currentTarget.classList.remove("bounce");
    // Force reflow to ensure animation restarts
    void e.currentTarget.offsetWidth;
    // Add bounce class to trigger animation
    e.currentTarget.classList.add("bounce");
    // Execute the provided fetch function
    fetchFunction();
  };

  // Effect to fetch data when contracts are ready
  useEffect(() => {
    if (migrationContract && oldKiltContract && !hasFetched) {
      console.log("useEffect triggering fetchAllData due to contracts being ready");
      fetchAllData();
    }
  }, [migrationContract, oldKiltContract, hasFetched]);

// Calculate percentage of total supply burned for Migration Progress
  const calculatePercentage = () => {
    if (burnAddressBalance === null || burnAddressBalance === "Error") return "N/A";
    const treasuryAmount = 7764239; 
    const totalBurned = burnAddressBalance + treasuryAmount; 
    const percentage = (totalBurned / TOTAL_KILT_SUPPLY) * 100;
    return percentage.toFixed(2); 
  };

  // Render the dashboard UI
  return (
    <div style={{ 
      backgroundImage: "url('/tartanbackground.png')", // Background tartan pattern
      backgroundColor: "#000", // Fallback color if image fails
      backgroundSize: "cover", // Cover entire viewport
      backgroundPosition: "center", // Center the image
      backgroundRepeat: "no-repeat", // Prevent tiling
      backgroundAttachment: "fixed", // Fixed position for parallax effect
      minHeight: "100vh", // Full viewport height
      fontFamily: "Arial, sans-serif" // Consistent font
    }}>
    
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

      <main>
        <div className={styles.container}> {/* Container for layout consistency */}
          {/* Top section with title, contract address, and refresh button */}
          <div style={{ textAlign: "center", margin: "20px 0" }}>
            <p style={{ fontSize: "32px", fontWeight: "bold" }}>Migration Dashboard</p>
            <p style={{ color: "#fff" }}>
              <span style={{ fontWeight: "bold" }}>Migration Contract: </span>0x4A62F30d95a8350Fc682642A455B299C074B3B8c
            </p>
            {/* Button to refresh all data except whitelist */}
            <button
              onClick={(e) => handleButtonClick(e, fetchAllData)} // Trigger bounce and fetch
              className={styles.card} // Apply card styles19: Apply card styles from CSS module
              style={{
                margin: "10px auto", // Center horizontally
                padding: "10px 20px", // Consistent padding
                width: "150px", // Fixed width
                height: "40px", // Fixed height matching other buttons
                display: "flex", // Flex for centering content
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "#DAF525", // Yellow to match portal's "Approve"
                fontSize: "16px" // Slightly smaller than portal buttons
              }}
            >
              Refresh Data
            </button>
          </div>

          {/* Loading indicator while contracts initialize */}
          {migrationLoading && <p style={{ textAlign: "center", color: "#fff" }}>Loading contract...</p>}

{/* Migration Progress card */}
          <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
            <div style={{ background: "rgba(19, 87, 187, 0.65)", padding: "15px", borderRadius: "8px", width: "600px", textAlign: "left", color: "#fff" }}>
              <div>
                <span style={{ fontWeight: "bold" }}>Migration Progress: </span>
                <span>
                  {oldKiltLoading || migrationLoading ? "Contract loading..." // Show loading state
                    : burnAddressBalance === null ? "Loading..." // Initial load
                    : burnAddressBalance === "Error" ? "Failed to load" // Error state
                    : `${(burnAddressBalance + 7764239).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} KILT / ${calculatePercentage()}%`} {/* Formatted balance with pre-burned amount and percentage */}
                </span>
              </div>
            </div>
          </div>

          {/* newToken card */}
          <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
            <div style={{ background: "rgba(19, 87, 187, 0.65)", padding: "15px", borderRadius: "8px", width: "600px", textAlign: "left", color: "#fff" }}>
              <div>
                <span style={{ fontWeight: "bold" }}>newToken: </span>
                <span>{newToken === null ? "Loading..." : newToken === "Error" ? "Failed to load" : newToken}</span>
              </div>
            </div>
          </div>

          {/* oldToken card */}
          <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
            <div style={{ background: "rgba(19, 87, 187, 0.65)", padding: "15px", borderRadius: "8px", width: "600px", textAlign: "left", color: "#fff" }}>
              <div>
                <span style={{ fontWeight: "bold" }}>oldToken: </span>
                <span>{oldToken === null ? "Loading..." : oldToken === "Error" ? "Failed to load" : oldToken}</span>
              </div>
            </div>
          </div>

          {/* EXCHANGE_RATE_NUMERATOR card */}
          <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
            <div style={{ background: "rgba(19, 87, 187, 0.65)", padding: "15px", borderRadius: "8px", width: "600px", textAlign: "left", color: "#fff" }}>
              <div>
                <span style={{ fontWeight: "bold" }}>EXCHANGE_RATE_NUMERATOR: </span>
                <span>{exchangeRateNumerator === null ? "Loading..." : exchangeRateNumerator === "Error" ? "Failed to load" : exchangeRateNumerator}</span>
              </div>
            </div>
          </div>

          {/* EXCHANGE_RATE_DENOMINATOR card */}
          <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
            <div style={{ background: "rgba(19, 87, 187, 0.65)", padding: "15px", borderRadius: "8px", width: "600px", textAlign: "left", color: "#fff" }}>
              <div>
                <span style={{ fontWeight: "bold" }}>EXCHANGE_RATE_DENOMINATOR: </span>
                <span>{exchangeRateDenominator === null ? "Loading..." : exchangeRateDenominator === "Error" ? "Failed to load" : exchangeRateDenominator}</span>
              </div>
            </div>
          </div>

          {/* isMigrationActive card */}
          <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
            <div style={{ background: "rgba(19, 87, 187, 0.65)", padding: "15px", borderRadius: "8px", width: "600px", textAlign: "left", color: "#fff" }}>
              <div>
                <span style={{ fontWeight: "bold" }}>isMigrationActive: </span>
                <span>{isMigrationActive === null ? "Loading..." : isMigrationActive === "Error" ? "Failed to load" : isMigrationActive.toString()}</span>
              </div>
            </div>
          </div>

          {/* paused card */}
          <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
            <div style={{ background: "rgba(19, 87, 187, 0.65)", padding: "15px", borderRadius: "8px", width: "600px", textAlign: "left", color: "#fff" }}>
              <div>
                <span style={{ fontWeight: "bold" }}>paused: </span>
                <span>{isPaused === null ? "Loading..." : isPaused === "Error" ? "Failed to load" : isPaused.toString()}</span>
              </div>
            </div>
          </div>

          {/* Whitelist check section with input and separate Query button */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "20px 0" }}>
            <div style={{ background: "rgba(19, 87, 187, 0.65)", padding: "15px", borderRadius: "8px", width: "510px", textAlign: "left", color: "#fff" }}>
              <div>
                <span style={{ fontWeight: "bold" }}>Check Whitelist: </span>
                {/* Input for user to enter an address to check */}
                <input
                  type="text"
                  value={whitelistAddress}
                  onChange={(e) => setWhitelistAddress(e.target.value)} // Update state on input change
                  placeholder="Enter address"
                  style={{ marginLeft: "10px", padding: "5px", width: "250px" }} // Fixed width for consistency
                />
                {/* Display whitelist result */}
                <span style={{ marginLeft: "10px" }}>{whitelistResult === null ? "" : whitelistResult === "Error" ? "Failed to load" : whitelistResult}</span>
              </div>
            </div>
            {/* Button to query whitelist status */}
            <button
              onClick={(e) => handleButtonClick(e, fetchWhitelistStatus)} // Trigger bounce and whitelist fetch
              className={styles.card}
              style={{ marginLeft: "10px", padding: "10px 20px", width: "80px", height: "40px", display: "flex", justifyContent: "center", alignItems: "center" }}
            >
              Query
            </button>
          </div>
        </div>
      </main>

      {/* Footer with navigation and links */}
      <footer style={{ padding: "10px", textAlign: "center", color: "#666", fontSize: "14px" }}>
        <div>
          <div style={{ marginBottom: "10px" }}>
            <Link href="/" className={styles.footerLink} style={{ color: "#fff", fontSize: "28px" }}>→Portal</Link> {/* Link back to Home page */}
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

      {/* CSS-in-JS for button bounce animation */}
      <style jsx>{`
        @keyframes bounce {
          0% { transform: scale(1); } /* Start at normal size */
          50% { transform: scale(0.95); } /* Shrink to 95% mid-animation */
          100% { transform: scale(1); } /* Return to normal size */
        }
        .bounce {
          animation: bounce 0.2s ease-in-out; /* Apply 0.2s bounce with smooth easing */
        }
      `}</style>
    </div>
  );
}

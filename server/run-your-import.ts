import { importYourRealOrders } from "./import-your-real-data";

async function runYourImport() {
  try {
    await importYourRealOrders();
    console.log("Your authentic orders imported successfully!");
  } catch (error) {
    console.error("Error importing your orders:", error);
  }
}

runYourImport();
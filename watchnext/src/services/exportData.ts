import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { getLibrary } from "./watchlist";
import { buildLibraryCsv } from "../lib/exportCsv";

// Export the user's library as a CSV and open the system share sheet.
export async function exportLibraryCsv(): Promise<void> {
  const library = await getLibrary();
  const csv = buildLibraryCsv(library);

  const file = new File(Paths.cache, "watchnext-library.csv");
  if (file.exists) file.delete();
  file.create();
  file.write(csv);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing isn't available on this device.");
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    UTI: "public.comma-separated-values-text",
    dialogTitle: "Export watchnext library",
  });
}

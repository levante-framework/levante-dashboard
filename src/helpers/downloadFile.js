const downloadFile = async (fileUrl, fileName) => {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error("Download failed");

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    Object.assign(document.createElement("a"), { href: url, download: fileName }).click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error(`Error downloading ${fileName}:`, error);
  }
};

export default downloadFile;
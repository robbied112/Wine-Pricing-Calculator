// /api/wine-lookup.js
export default async function handler(req, res) {
  const { wine } = req.query; // Get wine name from query params
  if (!wine) {
    return res.status(400).json({ error: "Wine name is required" });
  }

  try {
    const response = await fetch(
      `https://api.globalwinescore.com/wines/?search=${encodeURIComponent(wine)}&limit=1`,
      {
        headers: {
          Authorization: `Bearer YOUR_API_KEY_HERE`, // Replace with your Global Wine Score API key
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const wineData = data.results && data.results.length > 0 ? data.results[0] : null;

    if (!wineData) {
      return res.status(404).json({ message: "No wine data found" });
    }

    // Return relevant fields
    res.status(200).json({
      name: wineData.wine,
      vintage: wineData.vintage,
      score: wineData.global_wine_score,
      region: wineData.appellation,
    });
  } catch (error) {
    console.error("Error fetching wine data:", error);
    res.status(500).json({ error: "Failed to fetch wine data" });
  }
}
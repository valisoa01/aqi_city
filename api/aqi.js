// Vercel serverless function: GET /api/aqi
// Uses Neon's HTTP driver so no persistent server/connection pool is needed.
// Set DATABASE_URL in Vercel project settings (Environment Variables),
// never commit it to the repo.
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    const rows = await sql`
      SELECT
        f.aqi, f.pm25, f.pm10, f.no2, f.o3,
        c.city, c.country, c.latitude, c.longitude,
        t.date, t.hour, t.day_of_week, t.is_weekend, t.timestamp_utc
      FROM fact_aqi f
      JOIN dim_city c ON f.city_id = c.city_id
      JOIN dim_time t ON f.time_id = t.time_id
      ORDER BY t.timestamp_utc, c.city
    `;

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

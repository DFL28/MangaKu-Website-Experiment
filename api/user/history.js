// ===== Vercel Serverless Function - User History =====
// Note: Ini endpoint untuk user history, tapi karena Vercel stateless,
// data history disimpan di localStorage client-side

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Karena Vercel serverless, history disimpan di client-side (localStorage)
        // Endpoint ini hanya untuk kompatibilitas

        if (req.method === 'GET') {
            // Return empty history - client akan load dari localStorage
            return res.status(200).json({
                success: true,
                data: [],
                message: 'History stored in client localStorage'
            });
        }

        if (req.method === 'POST') {
            // Client-side akan handle POST ke localStorage
            return res.status(200).json({
                success: true,
                message: 'History saved to client localStorage'
            });
        }

        if (req.method === 'DELETE') {
            // Client-side akan handle DELETE dari localStorage
            return res.status(200).json({
                success: true,
                message: 'History deleted from client localStorage'
            });
        }

        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });

    } catch (error) {
        console.error('[Vercel] Error in user history:', error.message);

        return res.status(500).json({
            success: false,
            error: error.message || 'Terjadi kesalahan'
        });
    }
};

// ===== Vercel Serverless Function - User Bookmarks =====
// Note: Ini endpoint untuk user bookmarks, tapi karena Vercel stateless,
// data bookmarks disimpan di localStorage client-side

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Karena Vercel serverless, bookmarks disimpan di client-side (localStorage)
        // Endpoint ini hanya untuk kompatibilitas

        if (req.method === 'GET') {
            // Return empty bookmarks - client akan load dari localStorage
            return res.status(200).json({
                success: true,
                data: [],
                message: 'Bookmarks stored in client localStorage'
            });
        }

        if (req.method === 'POST') {
            // Client-side akan handle POST ke localStorage
            return res.status(200).json({
                success: true,
                message: 'Bookmark saved to client localStorage'
            });
        }

        if (req.method === 'DELETE') {
            // Client-side akan handle DELETE dari localStorage
            return res.status(200).json({
                success: true,
                message: 'Bookmark deleted from client localStorage'
            });
        }

        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });

    } catch (error) {
        console.error('[Vercel] Error in user bookmarks:', error.message);

        return res.status(500).json({
            success: false,
            error: error.message || 'Terjadi kesalahan'
        });
    }
};

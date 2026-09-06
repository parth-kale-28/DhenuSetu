export function notFound(req,res){res.status(404).json({message:`Route not found: ${req.method} ${req.originalUrl}`})}
export function errorHandler(err,_req,res,_next){console.error(err);res.status(500).json({message:process.env.NODE_ENV==='production'?'Internal server error':(err.message||'Internal server error')})}

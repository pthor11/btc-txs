import mongoose from '../mongoose'

const TXSchema = new mongoose.Schema({
   txid: {type: String, required: true, index: true, unique: true},
   hash: {type: String, required: true, index: true, unique: true},
   time: {type: Number, required: true, index: true},
   height: {type: Number, required: true, index: true},
   vin: {type: mongoose.Schema.Types.Mixed, default: null},
   vout: {type: mongoose.Schema.Types.Mixed, default: null}
})

export default mongoose.full_txs_conn.model('TX', TXSchema, 'btc')
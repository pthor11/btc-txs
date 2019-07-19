import mongoose from '../mongoose'

const ShortTXSchema = new mongoose.Schema({
    spent: {type: String, default: null},
    txid: { type: String, required: true, index: true },
    height: { type: Number, required: true, index: true },
    time: { type: Number, required: true, index: true },
    value: { type: Number, required: true },
    n: { type: Number, required: true, index: true },
    type: { type: String, required: true, index: true },
    addresses: { type: [String], index: true }
})

ShortTXSchema.index({ txid: 1, n: 1 }, {unique: true})

export default mongoose.short_txs_conn.model('ShortTX', ShortTXSchema, 'btc')
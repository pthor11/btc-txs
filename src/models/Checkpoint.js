import mongoose from '../mongoose'

const CheckpointSchema = new mongoose.Schema({
    mission: {type: String, required: true, index: true, unique: true},
    at: {type: Number, default: 0},
    data: {type: mongoose.Schema.Types.Mixed, default: null}
})

export default mongoose.full_txs_conn.model('Checkpoint', CheckpointSchema, 'checkpoints', true)
import mongoose from 'mongoose'
import {mongo} from './config'

mongoose.Promise = global.Promise

const wallet_txs_uri = `mongodb://${mongo.user}:${mongo.password}@${mongo.url}:${mongo.port}/${mongo.db_name}?authSource=${mongo.db_auth}`

const opts = {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    reconnectTries: Number.MAX_VALUE, 
    reconnectInterval: 1000
}

mongoose.wallet_txs_conn = mongoose.createConnection(wallet_txs_uri, opts)

export default mongoose
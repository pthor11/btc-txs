import rpc from './rpc'
import Checkpoint from './models/Checkpoint'
import FullTX from './models/TX.full'
import ShortTX from './models/TX.short'

let checkpoint = null

const run = async () => {
    try {

        checkpoint = checkpoint || (await Checkpoint.findOne({ mission: 'btc-fulltx' }) || new Checkpoint({ mission: 'btc-fulltx', at: 0 }))
        
        const blockHeight = checkpoint.at === 0 ? 0 : checkpoint.at + 1        

        const blockhash_response = await rpc('getblockhash', [blockHeight])

        const blockhash = blockhash_response.data.result

        const block_response = await rpc('getblock', [blockhash])
        const block = block_response.data.result

        let fullTXs = []
        let spentShortTXs = []
        let unspentShortTXs = []

        for (const txid of block.tx) {
            let rawtx_response = null
            try {
                rawtx_response = await rpc('getrawtransaction', [txid])
            } catch (err) {
                if (err.response.data.error.message === 'The genesis block coinbase is not considered an ordinary transaction and cannot be retrieved') {
                    continue
                }
            }

            const rawtx = rawtx_response.data.result
            const decodetx_response = await rpc('decoderawtransaction', [rawtx])
            const decodetx = decodetx_response.data.result

            if (decodetx.vout[0].scriptPubKey.addresses) {
                const fullTX = new FullTX({
                    ...decodetx,
                    time: block.time,
                    height: block.height
                })
                fullTXs.push(fullTX)
            }

            const spents = decodetx.vin.map(input => ShortTX.findOneAndUpdate({ $and: [{ txid: input.txid }, { n: input.vout }] }, { $set: { spent: decodetx.txid } }))
            spentShortTXs = [...spentShortTXs, ...spents]

            const unspents = decodetx.vout.reduce((unspents, output) => {
                const value = output.value
                const type = output.scriptPubKey.type
                const addresses = output.scriptPubKey.addresses//.map(address => {return {address}})
                const n = output.n
                if ((value && type && addresses) && type !== "nonstandard") {
                    const unspent = new ShortTX({
                        txid: decodetx.txid,
                        height: block.height,
                        time: block.time,
                        value,
                        n,
                        type,
                        addresses
                    })
                    unspents.push(unspent.save())
                }
                return unspents
            }, [])
            unspentShortTXs = [...unspentShortTXs, ...unspents]
        }

        await Promise.all([
            FullTX.insertMany(fullTXs),
            Promise.all(spentShortTXs),
            Promise.all(unspentShortTXs)
        ])

        checkpoint.at += 1
        await checkpoint.save()
        run()
    } catch (err) {
        console.log(err.response.data)
        setTimeout(start, 1000)
    }

}

const rollback = async () => {
    checkpoint = await Checkpoint.findOne({ mission: 'btc-fulltx' })
    if (checkpoint) {
        await FullTX.deleteMany({ height: { $gt: checkpoint.at } })
        await ShortTX.deleteMany({ height: { $gt: checkpoint.at } })
    }
}

const start = async () => {
    await rollback()
    await run()
}

start()
import rpc from './rpc'
import TXO from './models/TXO'

const getTX = async (txid, block) => {
    try {
        const rawtx_response = await rpc('getrawtransaction', [txid])
        const rawtx = rawtx_response.data.result
        const decodetx_response = await rpc('decoderawtransaction', [rawtx])
        const decodetx = decodetx_response.data.result

        await Promise.all(decodetx.vin.map(input => TXO.findOneAndUpdate({ $and: [{ txid: input.txid }, { n: input.vout }] }, { $set: { spent: decodetx.txid } })))

        let unspentTXOs = []

        for (const output of decodetx.vout) {
            const value = output.value
            const type = output.scriptPubKey.type
            const addresses = output.scriptPubKey.addresses
            const n = output.n
            if ((value && type && addresses) && type !== "nonstandard") {
                const unspentTXO = {
                    txid: decodetx.txid,
                    height: block.height,
                    time: block.time,
                    value,
                    n,
                    type,
                    addresses
                }
                unspentTXOs.push(unspentTXO)
            }
        }
        return Promise.resolve(unspentTXOs)
    } catch (error) {
        console.log(error.response.data)
        return Promise.resolve(null)
    }
}

function chunkArrayInGroups(arr, size) {
    var myArray = [];
    for(var i = 0; i < arr.length; i += size) {
      myArray.push(arr.slice(i, i+size));
    }
    return myArray;
  }

const run = async (blockHeight) => {
    try {

        const blockhash_response = await rpc('getblockhash', [blockHeight])

        const blockhash = blockhash_response.data.result

        const block_response = await rpc('getblock', [blockhash])

        const block = block_response.data.result

        if (!block) {
            console.log(`get block height ${blockHeight} failed`)
            setTimeout(start, 1000)
            return Promise.resolve(true)
        }

        const unspentTXOs_array = await Promise.all(block.tx.map(txid => getTX(txid, block)))
        const unspentTXOs = unspentTXOs_array.filter(array => array !== null).reduce((unspentTXOs, array) => {
            unspentTXOs = [...unspentTXOs, ...array]
            return unspentTXOs
        }, [])

        const groupUTXOs = chunkArrayInGroups(unspentTXOs, 500)

        await Promise.all(groupUTXOs.map(group => TXO.insertMany(group)))

        console.log(`block ${block.height} get ${block.tx.length} txs`)

        run(block.height + 1)

    } catch (error) {
        if (error.response.data.error.code === -1) {
            console.log(`btc-txs is up to date`)
        } else {
            console.log(error.response)
        }
        setTimeout(start, 1000)
    }

}

const rollback = async () => {
    const lastTX = await TXO.findOne({}, { _id: 0, height: 1 }).sort({ height: -1 })
    if (lastTX) {
        await TXO.deleteMany({ height: lastTX.height })
        return Promise.resolve(lastTX.height)
    } else {
        return Promise.resolve(1)
    }
}

const start = async () => {
    try {
        const blockHeight = await rollback()
        console.log(`rollback from block ${blockHeight}`)

        await run(blockHeight)
    } catch (error) {
        console.log(error)
        start()
    }
}

start()
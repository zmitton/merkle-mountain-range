/* 
.load fileBasedDbTest.js 
*/
const MMR = require('./../mmr')
const { ethereumFlyClientHash } = require('./../hashingFunctions')

const FileBasedDB = require('./fileBasedDb')


mmr = new MMR(new FileBasedDB('./fileBasedDbFixtures'), ethereumFlyClientHash)
// r = new MMR(new FileBasedDB('./../etc-set'), ethereumFlyClientHash)
mmr.db.get(0).then((response)=>{

})

flyProof: {
  nodes: {
    0:    '0x32485946587657893465867354',
    5:    '0x98567657456635435344544663',
    23:   '0x65654365623636234543543545',
    104:  '0x15654365623636234543543545',
    3314: '0x24dffd65623636234543543545',
    3434: '0x11654365623636234543543545',
  }
  blockheaders:{
    0: '0xposiblyrlpencodedblockheaderhere',
    26: '0xposiblyrlpencodedblockheaderhere',
    634: '0xposiblyrlpencodedblockheaderhere',
  },
  ethashData: {
    /* no idea how this will look*/
  },
}
// premature optimization: the leaf nodes can be omitted when _building_ the proof. The client can 
// recreate & add them by iterating though the blockheaders i.e. `mmr.set(MMR.getNodeIndex(bkl.num), blk.hash)`

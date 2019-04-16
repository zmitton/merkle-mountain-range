// const WORD_SIZE = 64

// class ProofDb extends Array {
//   constructor(leafLength){
//     super(0)
//     Object.defineProperty(this, 'leafLength', { value: leafLength, writable: true })
//   }

//   get(index){
//     return this[index]
//   }
//   set(index, value){
//     if(value == undefined){
//       delete this[index]
//     }else{
//       this[index] = value
//     }
//   }
//   getLeafLength(){
//     return this.leafLength
//   }
//   setLeafLength(leafLength){
//     return this.leafLength = leafLength
//   }
//   getIndices(){
//     return this.map((_, index)=>{ return index})
//   }
// }

// module.exports = ProofDb

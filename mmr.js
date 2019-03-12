// fs.writeFile('thing1',Buffer.from('34','hex'), (e,r,a)=>{console.log(e,r,a)})
// fs.writeFileSync(file, data[, options])
// class Navigator{
//   constructor(opts){
//     this.i = opts.i
//     this.h = opts.h
//     this.r = opts.r
//   }
//   height(){
//     return this.h = this.h || MMR.height(this.i)
//   }
//   rightness(){
//     return this.r = this.r || MMR.rightness(this.i)
//   }
// }

class Node{
  constructor(index, height, rightness){
    this.index = index 
    this.height = height
    this.rightness = rightness

    Object.defineProperty(this, 'i', {
      get: () => { return this.index },
    })
    Object.defineProperty(this, 'h', {
      get: () => { 
        return this.height ? this.height : this.height = MMR.height(this.i) 
      },
    })
    Object.defineProperty(this, 'r', {
      get: () => { // whether it is a right edge - `true` or a left edge - `false`
        if(this.rightness === undefined){
          return this.rightness = MMR.rightness(this.i)
        } else {
          return this.rightness
        }
      },
    })
  }
}


class MMR extends Array{
  constructor(){
    super(0)
    //     Object.defineProperty(this, 'i', {
    //   get: () => { return this.index },
    // })
  }

  put(value){ // puts at the end ONLY
    let append = MMR.appendIndices(this.length)
    this.push(value)
    for (var i = 0 ; i < append.length; i++) {
      this.push(MMR.hash(append[i][0], append[i][1]))
    }
  }
  hash(){

  }

  putNth(n, value){

  }

  root(){
    return MMR.root(this.length)
  }

  static root(length){ // final root of bagged peaks
    let currentRow = MMR.peakIndices(length)
    console.log("currentRow: ", currentRow)
    while(currentRow.length > 1) {
      let parentRow = []
      for (var i = 1; i < currentRow.length; i += 2) {
        parentRow.push(MMR.hash(currentRow[i-1],currentRow[i]))
      }
      if(currentRow.length %2 == 1) { parentRow.push(currentRow[currentRow.length-1])}
      currentRow = parentRow
    }
    return currentRow[0]
  }

  static bagProof(length){}
  static localPeakProof(length){}


  static appendIndices(length){ // indexes to hash after update (at the end ONLY)
    let indices = []
    while(this.rightness(length)){
      indices.push([this.leftSib(length), length])
      length++
    }
    return indices
  }

  static get(n){ // index of nth leaf// should not be using peak height. doesnt seem to make sense
    // I guess actually it might be ok. fph is a reference of sorts. essentially just getting the exp
    // on 3rd thought, better to use something named logFloor as the generic instead of this shit
    let index = 0
    let exponent = this.logFloor(n + 1)
    while(exponent >= 0){
      if(n >= 2**exponent){
        index += 2**(exponent+1)-1
        n -= 2**exponent
      }
      exponent--
    }
    return index
  }

  // static getMountainStack(n, length){ //wip
  //   let i = 0
  //   let exponent = this.logFloor(length+1) // 2**5 = 32
  //   let currentPeak = 2**exponent-2 // init to first peak
  //   while(n > currentPeak/2){

  //     // nthPeak++
  //     // currentPeak +=
  //   }
  // }
  static localPeak(leafIndex, length){ // 2log(n)+ log(log(n))
  //might need a method like this that takes the localPeak i
    let peakNodes = MMR.peakNodes(length)
    for (var i = 0; i < peakNodes.length; i++) {
      if(leafIndex * 2 <= peakNodes[i].i){
        return peakNodes[i]
      }
    }
  }
  static localPeakPath(localPeak, nodeIndex){ //
  // assume local peak is correct for n
    let nodePath = [localPeak]
    for (let h = localPeak.h ; h > 0; h--) {
      if(nodePath[nodePath.length-1].i - nodeIndex < 2**h){
        nodePath.push(MMR.rightChildNode(nodePath[nodePath.length-1]))
      } else{
        nodePath.push(MMR.leftChildNode(nodePath[nodePath.length-1]))
      }
    }
    return nodePath // untested
  }

  // static touch(n, peakIndexOfN){ // array of indexes traversed from peak
  //   let h = peakHeight(i+1)

  // }

  // static myPeak(n){ 
  //   let i = this.get(n)
  //   peakHeight(i+1+1)
  // }

  static leftSib(i, h){ //must have one
    return i + 1 - 2**(this.height(i) + 1)
  }
  static rightSib(i, h){ //must have one
    return i + 2**(this.height(i) + 1) - 1
  }
  static leftChild(i){ //must have one
    return i - 2**this.height(i)
  }
  static rightChild(i){ //must have one
    return i - 1;
  }
  static leftChildNode(node){
    return new Node(node.i - 2**node.h, node.h - 1, false)
  }
  static rightChildNode(node){
    return new Node(node.i - 1, node.h - 1, true)
  }
  static siblingNode(node){
    let multiplier = node.r ? -1 : 1
    return new Node (node.i + multiplier * (2**(node.h + 1) - 1), node.h, !node.r)
  }

  static parentNode(node){
    if(node.r){
      return new Node(node.i + 1, node.h + 1/*, rightness??? */)
    }else{
      return new Node(node.i + 2**(node.h + 1), node.h + 1 /*, rightness??? */)
    }
  }


  static rightness(i){
    let ph = this.peakHeight(i+1)
    while(ph > - 2){
      if(2**(ph+2) - 2 == i){
        return false
      }
      if(2**(ph+2) - 2 < i){
        i = i - (2**(ph+2) - 1)
      } 
      if(2**(ph+2) - 2 == i){
        return true
      }
      ph--
    }
  }
  static _isCorrupt(length){ // final node should always be "Left"
    return this.rightness(length-1)
  }

  static peakIndices(length){
    if(length == 0){ return [] }
    let h = this.peakHeight(length)
    let is = [2**(h+1)-2]
    while(h > 0){
      h--
      let np = is[is.length-1] + 2**(h+1)-1
      if(length > np){
        is.push(np)
      }
    }
    return is
  }
  static peakNodes(length){ // 2log(n)
    if(length == 0){ return [] }
    let peak = this.peakNode(length)
    let currentH = peak.h
    let peakNodes = [thisPeak]
    while(currentPeak > 0){
      currentPeak--
      let nextPeakI = peakNodes[peakNodes.length - 1].i + 2**(currentPeak + 1) - 1
      if(length > nextPeakI){
        peakNodes.push(new Node(nextPeakI, currentPeak, true))
      }
    }
    return peakNodes
  }
  static peakOfN(peakIndices, n){
    // for (let j = 0; j < peakIndices.length; j++) {
    //   peakIndices[j]
    // }
  }

  // static ph(length){ return this.peakHeight(length) }
  // static peakHeight(length){ // i must be of a leaf node
  //   let exponent = 0
  //   while(2**exponent - 2 < length){ exponent++ }
  //   return exponent - 2
  // }
  static peak(length){
    let peakHeight = this.logFloor(length + 1) - 1
    return new Node((2**h + 1) - 2, peakHeight, false)
  }

  static peakHeight(length){ // i must be length
    return this.logFloor(length + 1) - 1
  }

  static logFloor(num){ //log(n)
    let exp = 0
    while(2**exp <= num){ exp++ }
    return exp - 1
  }
  // static logCeil(num){
  //   let exp = 0
  //   while(2**exp <= num){ exp++ }
  //   return exp
  // }

  // static p(length){ 
  //   return 2**(this.peakHeight(length)+1) - 2
  // }
  // static peak(i){ // i must be of a leaf node // depricate
  //   return 2**(this.peakHeight(i)+1) - 2
  // }

  static height(i){ // i must be of a leaf node // ??? that doesnt make sense or seem to be true
    //actually this function looks pretty good. give it more testing
    let ph = this.peakHeight(i + 1)
    while(ph > - 2){
      if(2**(ph+2) - 2 < i){
        i = i - (2**(ph+2) - 1)
      } 
      if(2**(ph+2) - 2 == i){
        return ph + 1
      }
      ph--
    }
  }
  static hash(a,b) {
    return "h("+a+","+b+")"
  }
}

r = new MMR()
r.put(0)
r.put(1)
r.put(3)
r.put(4)
r.put(7)
r.put(8)
r.put(10)
r.put(11)
r.put(15)
r.put(16)
r.put(18)



  // static lookupNode(i, db){ // template for dealing with vitalik's optimum w proof
  //   let node = db.get(i)
  //   if(node){
  //     return node
  //   } else {
  //     if(this.height(i) > 0){ // has children
  //       let lChild = this.lookupNode(this.leftChild(i), db)
  //       let rChild = this.lookupNode(this.rightChild(i), db)
  //       if(lChild && rChild){
  //         return this.hash(lChild, rChild)
  //       }
  //     }
  //     return false
  //   }
  // }
module.exports = MMR


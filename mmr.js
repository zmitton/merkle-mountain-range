// fs.writeFile('thing1',Buffer.from('34','hex'), (e,r,a)=>{console.log(e,r,a)})


class MMR extends Array{
  constructor(){
    super(0)
  }

  put(value){ // puts at the end ONLY
    let append = MMR.append(this.length)
    this.push(value)
    for (var i = 0 ; i < append.length; i++) {
      this.push(MMR.hash(append[i][0], append[i][1]))
    }
  }
      // console.log("currentRow.length ",currentRow.length)

  root(){
    return MMR.root(this.length)
  }

  static root(length){
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



  static append(length){ // indexes to hash after update (at the end ONLY)
    let indices = []
    while(this.isRight(length)){
      indices.push([this.leftSib(length), length])
      length++
    }
    return indices
  }

  static get(n){ // index of nth leaf
    let total = 0
    let ph = this.peakHeight(n-1) + 1
    while(ph >= 0){
      if(n >= 2**ph){
        total += 2**(ph+1)-1
        n -= 2**ph
      }
      ph--
    }
    return total
  }

  static touch(n, peakIndexOfN){ // array of indexes traversed from peak
    let h = peakHeight(i)

  }

  static myPeak(n){ 
    let i = this.get(n)
    peakHeight(i+1)
  }

  static leftSib(i){
    return i + 1 - 2**(this.height(i) + 1)
  }
  static rightSib(i, h){
    return i + 2**(this.height(i) + 1) - 1
  }

  static isRight(i){
    let ph = this.peakHeight(i)
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
    return this.isRight(length-1)
  }

  static peakIndices(length){
    if(length == 0){ return [] }
    let h = this.ph(length)
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

  static ph(length){ return this.peakHeight(length - 1) }
  static peakHeight(i){ // i must be of a leaf node
    let exponent = 0
    while(2**exponent - 3 < i){ exponent++ }
    return exponent - 2
  }
  static p(length){ return this.peak(length - 1) }
  static peak(i){ // i must be of a leaf node
    return 2**(this.peakHeight(i)+1) - 2
  }

  static height(i){ // i must be of a leaf node // ??? that doesnt make sense or seem to be true
    //actually this function looks pretty good. give it more testing
    let ph = this.peakHeight(i)
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



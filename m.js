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

class MMR{
  constructor(dbPath){
    this.dbPath = dbPath
    this.db = fs.openSync(dbPath, 'a+')
  }

  async get(n){
    let index = MMR.get(n)
    return this.read(index)
  }
  async put(value, n){
    return this._put(value, MMR.get(n))
  }

  async append(value){ //depricate
    return this._put(value)
  }
  async _put(value, i){
    let length = await this.length()
    let nodePairs = MMR.relevantNodes(length, i)
    await this.write(value, i)
    console.log("HHHHH", nodePairs, length, i)
    return this.hashUp(nodePairs)
  }

  async hashUp(nodePairs){
    for (var i = 0; i < nodePairs.length; i++) {
      let leftChild = await this.read(nodePairs[i][0].i)
      let rightChild = await this.read(nodePairs[i][1].i)
      await this.write(MMR.hash(leftChild, rightChild))
    }
  }

  async length(){
    let size = await this._size()
    let length = size/32
    if(MMR._isCorrupt(length)){
      throw new Error("isCorrupt length for tree " + length)
    }
    return length
  }
  async root(){ // merklizes the peaks
    let length = await this.length()
    let currentRow = await this.readPeaks(length)

    while(currentRow.length > 1) {
      let parentRow = []
      for (var i = 1; i < currentRow.length; i += 2) {
        let hash = await MMR.hash(currentRow[i-1],currentRow[i])
        parentRow.push(hash)
      }
      if(currentRow.length % 2 == 1) { parentRow.push(currentRow[currentRow.length-1])}
      currentRow = parentRow
    }
    return currentRow[0]
  }

  async readPeaks(){
    let length = this.length()
    return this.readMany(MMR.peakIndices(length))
  }
  async readMany(indexes){
    return Promise.all(indexes.map((i) => { return this.read(i) }))
  }
  async read(index){
    var indexToFirstByte = index*32
    var chunk = Buffer.alloc(32)
    return new Promise((resolve, reject)=>{
      fs.read(this.db, chunk, 0, 32, indexToFirstByte, (e, r)=>{
        if(e){
          reject(e)
        }else{
          resolve(chunk)
        }
      })
    })
  }

  async write(hash, index){
    let size = await this._size()
    let length = size/32
    if(!index){
      let index = size/32
    } else if(index > length){
      console.log('IIIIIIINDEX GREATER THAN LENGTH')
      let amountToWrite = (index - length) * 32
      let padding = Buffer.alloc(amountToWrite)
      await this._write(this.db, padding, amountToWrite , length * 32)
    }
    return this._write(this.db, hash, 32, index * 32)
  }

  async _write(db, inputData, amount, startPos){
    console.log(db, inputData, amount, startPos)
    return new Promise((resolve, reject)=>{
      fs.write(db, inputData, 0, amount, startPos, (e, r)=>{
        if(e){
          reject(e)
        }else{
          resolve(r)
        }
      })
    })
  }

  // async write(index, hash){ }

  async _size(){
    return new Promise((resolve, reject)=>{
      fs.stat(this.dbPath, (e,s) => {
        if(e){
          reject(e)
        }else{
          var length = Math.round(s.size/32)
          if(s.size % 32 != 0 ){
            reject(new Error("Corrupt length for db. Size not divis by 32 " + s.size))
          }else{
            resolve(s.size)
          }
        }
      })
    })
  }

  static bagProof(length){}
  static localPeakProof(length){}


  static relevantNodes(length, i){ // indexes to hash after update (at the end ONLY)
    let nodes = []
    let node = new Node(i || length)

    while(node.r || node.i + 1 < length){
      if(node.r){
        nodes.push([this.siblingNode(node), node])
      }else{
        nodes.push([node, this.siblingNode(node)])
      }
      node = this.parentNode(node)
    }
    return nodes
  }

  static get(n){
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


  // static leftSib(i, h){ //must have one
  //   return i + 1 - 2**(this.height(i) + 1)
  // }
  // static rightSib(i, h){ //must have one
  //   return i + 2**(this.height(i) + 1) - 1
  // }
  // static leftChild(i){ //must have one
  //   return i - 2**this.height(i)
  // }
  // static rightChild(i){ //must have one
  //   return i - 1;
  // }
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
      return new Node(node.i + 1, node.h + 1)
    }else{
      return new Node(node.i + 2**(node.h + 1), node.h + 1)
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


  static peakHeight(length){ 
    return this.logFloor(length + 1) - 1
  }

  static logFloor(num){ 
    let exp = 0
    while(2**exp <= num){ exp++ }
    return exp - 1
  }
  static height(i){ 
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
    //throw _corrupt_ error if the buffer is null
    return Buffer.from(keccak256(Buffer.concat([
      Buffer.from(keccak256(a),'hex'),
      Buffer.from(keccak256(b),'hex')
    ])),'hex')
  }

//not in use
  static peak(length){
    let peakHeight = this.logFloor(length + 1) - 1
    return new Node((2**peakHeight + 1) - 2, peakHeight, false)
  }
}

module.exports = MMR

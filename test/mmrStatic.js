const assert   = require('assert');
const MMR      = require('./../src/merkleMountainRange')
const Position = require('./../src/position')

describe('MerkleMountinRange (MMR) static/synchronous class functions' , () => {
  context('#getNodePosition', () => {
    it('single index', () => { assert.equal(MMR.getNodePosition(5).i, 8) })
    it('single index', () => { assert.equal(MMR.getNodePosition(11).i, 19) })
    it('single index', () => { assert.equal(MMR.getNodePosition(32).i, 63) })
    it('many indexes', () => {
      let leafIndexToNodeIndexMappings = [
        [0, 0], [1, 1], [2, 3], [3, 4], [4,7], [5,8], [6,10], [7,11], 
        [8,15], [9,16], [10,18], [11,19], [12,22], [13,23], [14,25], 
        [15,26], [16,31], [17,32], [18,34], [19,35], [20,38],[21,39], 
        [22,41], [23,42], [24,46], [25,47], [26,49], [27,50], [28,53], 
        [29,54], [30,56], [31,57], [32,63], [33,64]
      ]
      leafIndexToNodeIndexMappings.forEach((pair)=>{
        let leafIndex = pair[0]
        let nodeIndex = pair[1]
        assert.equal(MMR.getNodePosition(leafIndex).i, nodeIndex)
      })
    })
  })

  context('#leftChildPosistion', () => {
    it('for 62, 30, 45, 51, 60', () => {
      assert.deepEqual(
        MMR.leftChildPosition(new Position(62, 5, false)),
        new Position(30, 4, false)
      )
      assert.deepEqual(
        MMR.leftChildPosition(new Position(30, 4,false)),
        new Position(14, 3, false)
      )
      assert.deepEqual(
        MMR.leftChildPosition(new Position(45, 3, false)),
        new Position(37, 2, false)
      )
      assert.deepEqual(
        MMR.leftChildPosition(new Position(51, 1, true)),
        new Position(49, 0, false)
      )
      assert.deepEqual(
        MMR.leftChildPosition(new Position(60, 3, true)),
        new Position(52, 2, false)
      )
    })
  })

  context('#richtChildPosition', () => {
    it('for 62, 61, 5, 65, 44', () => {
      assert.deepEqual(
        MMR.rightChildPosition(new Position(62, 5, false)),
        new Position(61, 4, true)
      )
      assert.deepEqual(
        MMR.rightChildPosition(new Position(61, 4, true)),
        new Position(60, 3, true)
      )
      assert.deepEqual(
        MMR.rightChildPosition(new Position(5, 1, true)),
        new Position(4, 0, true)
      )
      assert.deepEqual(
        MMR.rightChildPosition(new Position(65, 1, false)),
        new Position(64, 0, true)
      )
      assert.deepEqual(
        MMR.rightChildPosition(new Position(44, 2, true)),
        new Position(43, 1, true)
      )
    })
  })

  context('#siblingPosition', () => {
    it('for 62, 61, 5, 65, 44', () => {
      assert.deepEqual(
        MMR.siblingPosition(new Position(62, 5, false)),
        new Position(125, 5, true)
      )
      assert.deepEqual(
        MMR.siblingPosition(new Position(61, 4, true)),
        new Position(30, 4, false)
      )
      assert.deepEqual(
        MMR.siblingPosition(new Position(5, 1, true)),
        new Position(2, 1, false)
      )
      assert.deepEqual(
        MMR.siblingPosition(new Position(65, 1, false)),
        new Position(68, 1, true)
      )
      assert.deepEqual(
        MMR.siblingPosition(new Position(44, 2, true)),
        new Position(37, 2, false)
      )
    })
  })

  context('#parentIndex', () => {
    it('for 62, 61, 5, 65, 44', () => {
      assert.deepEqual(MMR.parentIndex(new Position(62, 5, false)), 126)
      assert.deepEqual(MMR.parentIndex(new Position(61, 4, true)), 62)
      assert.deepEqual(MMR.parentIndex(new Position(5, 1, true)), 6)
      assert.deepEqual(MMR.parentIndex(new Position(65, 1, false)), 69)
      assert.deepEqual(MMR.parentIndex(new Position(44, 2, true)), 45)
    })
  })

  context('#peakPosition', () => {
    it('of 0', () => {
      let computedPeaks = MMR.peakPositions(0)
      let expectedPeaks = [ new Position(0, 0, false) ]
      assert.deepEqual(expectedPeaks, computedPeaks)
    })
    it('of 1', () => {
      let computedPeaks = MMR.peakPositions(1)
      let expectedPeaks = [ new Position(2, 1, false) ]
      assert.deepEqual(expectedPeaks, computedPeaks)
    })
    it('of 2', () => {
      let computedPeaks = MMR.peakPositions(2)
      let expectedPeaks = [
        new Position(2, 1, false),
        new Position(3, 0, false)
      ]
      assert.deepEqual(expectedPeaks, computedPeaks)
    })
    it('of 9', () => {
      let computedPeaks = MMR.peakPositions(9)
      let expectedPeaks = [
        new Position(14, 3, false),
        new Position(17, 1, false)
      ]
      assert.deepEqual(expectedPeaks, computedPeaks)
    })
    it('of 30', () => {
      let computedPeaks = MMR.peakPositions(30)
      let expectedPeaks = [
        new Position(30, 4, false),
        new Position(45, 3, false),
        new Position(52, 2, false),
        new Position(55, 1, false),
        new Position(56, 0, false)
      ]
      assert.deepEqual(expectedPeaks, computedPeaks)
    })
    it('of 31', () => {
      let computedPeaks = MMR.peakPositions(31)
      let expectedPeaks = [
        new Position(62, 5, false)
      ]
      assert.deepEqual(expectedPeaks, computedPeaks)
    })
    it('of 32', () => {
      let computedPeaks = MMR.peakPositions(32)
      let expectedPeaks = [
        new Position(62, 5, false),
        new Position(63, 0, false)
      ]
      assert.deepEqual(expectedPeaks, computedPeaks)
    })
    it('of 33', () => {
      let computedPeaks = MMR.peakPositions(33)
      let expectedPeaks = [
        new Position(62, 5, false),
        new Position(65, 1, false)
      ]
      assert.deepEqual(expectedPeaks, computedPeaks)
    })
  })

  context('#localPeakPosition', () => {
    it('of 0, 0', () => { // re-check first 4 - 7 of these
      let computedPeak = MMR.localPeakPosition(0, 0)
      let expectedPeak = new Position(0, 0, false)
      assert.deepEqual(computedPeak, expectedPeak)
    })
    it('of 1, 0', () => {
      let computedPeak = MMR.localPeakPosition(1, 0)
      let expectedPeak = new Position(2, 1, false)
      assert.deepEqual(computedPeak, expectedPeak)
    })
    it('of 2, 2', () => {
      let computedPeak = MMR.localPeakPosition(2, 2)
      let expectedPeak = new Position(3, 0, false)
      assert.deepEqual(computedPeak, expectedPeak)
    })
    it('of 9, 6', () => {
      let computedPeak = MMR.localPeakPosition(9, 6)
      let expectedPeak = new Position(17, 1, false)
      assert.deepEqual(computedPeak, expectedPeak)
    })
    it('of 30, 14', () => {
      let computedPeak = MMR.localPeakPosition(30, 14)
      let expectedPeak = new Position(56, 0, false)
      assert.deepEqual(computedPeak, expectedPeak)
    })
    it('of 30, 31', () => {
      let computedPeak = MMR.localPeakPosition(30, 31)
      let expectedPeak = new Position(56, 0, false)
      assert.deepEqual(computedPeak, expectedPeak)
    })
    it('of 31, 30', () => {
      let computedPeak = MMR.localPeakPosition(31, 30)
      let expectedPeak = new Position(62, 5, false)
      assert.deepEqual(computedPeak, expectedPeak)
    })
    it('of 32, 30', () => {
      let computedPeak = MMR.localPeakPosition(32, 30)
      let expectedPeak = new Position(63, 0, false)
      assert.deepEqual(computedPeak, expectedPeak)
    })
    it('of 31, 55', () => {
      let computedPeak = MMR.localPeakPosition(31, 55)
      let expectedPeak = new Position(62, 5, false)
      assert.deepEqual(computedPeak, expectedPeak)
    })
    it('of 32 32', () => {
      let computedPeak = MMR.localPeakPosition(32, 32)
      let expectedPeak = new Position(63, 0, false)
      assert.deepEqual(computedPeak, expectedPeak)
    })
    it('of 33, 33', () => {
      let computedPeak = MMR.localPeakPosition(33, 33)
      let expectedPeak = new Position(65, 1, false)
      assert.deepEqual(computedPeak, expectedPeak)
    })
    it('of 33, 34', () => {
      let computedPeak = MMR.localPeakPosition(33, 34)
      let expectedPeak = new Position(65, 1, false)
      assert.deepEqual(computedPeak, expectedPeak)
    })
    it('of 33, 35', () => {
      let computedPeak = MMR.localPeakPosition(33, 35)
      let expectedPeak = new Position(65, 1, false)
      assert.deepEqual(computedPeak, expectedPeak)
    })
    it('of 33, 36', () => {
      let computedPeak = MMR.localPeakPosition(33, 36)
      let expectedPeak = new Position(69, 2, false)
      assert.deepEqual(computedPeak, expectedPeak)
    })
    it('of 33, 45', () => {
      let computedPeak = MMR.localPeakPosition(33, 45)
      let expectedPeak = new Position(77, 3, false)
      assert.deepEqual(computedPeak, expectedPeak)
    })
    it('of 33, 47', () => {
      let computedPeak = MMR.localPeakPosition(33, 47)
      let expectedPeak = new Position(77, 3, false)
      assert.deepEqual(computedPeak, expectedPeak)
    })
    it('of 33, 49', () => {
      let computedPeak = MMR.localPeakPosition(33, 49)
      let expectedPeak = new Position(93, 4, false)
      assert.deepEqual(computedPeak, expectedPeak)
    })
    it('of 33, 69', () => {
      let computedPeak = MMR.localPeakPosition(33, 69)
      let expectedPeak = new Position(126, 6, false)
      assert.deepEqual(computedPeak, expectedPeak)
    })
  })

  context('#godPeakFromLeafIndex', () => {
    it('of 0,1,2,3,4,5,6,7,8,14,15,16,26,30,31', () => {
      assert.deepEqual(new Position(2, 1, false), MMR.godPeakFromLeafIndex(0))
      assert.deepEqual(new Position(6, 2, false), MMR.godPeakFromLeafIndex(1))
      assert.deepEqual(new Position(6, 2, false), MMR.godPeakFromLeafIndex(2))
      assert.deepEqual(new Position(14, 3, false), MMR.godPeakFromLeafIndex(3))
      assert.deepEqual(new Position(14, 3, false), MMR.godPeakFromLeafIndex(4))
      assert.deepEqual(new Position(14, 3, false), MMR.godPeakFromLeafIndex(5))
      assert.deepEqual(new Position(14, 3, false), MMR.godPeakFromLeafIndex(6))
      assert.deepEqual(new Position(30, 4, false), MMR.godPeakFromLeafIndex(7))
      assert.deepEqual(new Position(30, 4, false), MMR.godPeakFromLeafIndex(8))
      assert.deepEqual(new Position(30, 4, false), MMR.godPeakFromLeafIndex(14))
      assert.deepEqual(new Position(62, 5, false), MMR.godPeakFromLeafIndex(15))
      assert.deepEqual(new Position(62, 5, false), MMR.godPeakFromLeafIndex(16))
      assert.deepEqual(new Position(62, 5, false), MMR.godPeakFromLeafIndex(26))
      assert.deepEqual(new Position(62, 5, false), MMR.godPeakFromLeafIndex(30))
      assert.deepEqual(new Position(126, 6, false), MMR.godPeakFromLeafIndex(31))
    })
  })

  context('#mountainPositions', () => {
    it('of peakPosition 0 -> 0', () => {
      assert.deepEqual([], MMR._mountainPositions(new Position(0, 0, false), 0))
    })
    it('of peakPosition 2 -> 0', () => {
      let expectedPositions = [[
        new Position(0, 0, false),
        new Position(1, 0, true)
      ]]
      let computedPositions = MMR._mountainPositions(new Position(2, 1, false), 0)
      assert.deepEqual(computedPositions, expectedPositions)
    })
    it('of peakPosition 2 -> 1', () => {
      let expectedPositions = [[
        new Position(0, 0, false),
        new Position(1, 0, true)
      ]]
      let computedPositions = MMR._mountainPositions(new Position(2, 1, false), 1)
      assert.deepEqual(computedPositions, expectedPositions)
    })
    it('of peakPosition 3 -> 3', () => {
      let expectedPositions = []
      let computedPositions = MMR._mountainPositions(new Position(3, 0, false), 3)
      assert.deepEqual(computedPositions, expectedPositions)
    })
    it('of peakPosition 6 -> 0 and 6 -> 1', () => {
      let expectedPositions = [
        [
          new Position(2, 1, false),
          new Position(5, 1, true)
        ],[
          new Position(0, 0, false),
          new Position(1, 0, true)
        ]
      ]
      let computedPositions = MMR._mountainPositions(new Position(6, 2, false), 0)
      assert.deepEqual(computedPositions, expectedPositions)
      computedPositions = MMR._mountainPositions(new Position(6, 2, false), 1)
      assert.deepEqual(computedPositions, expectedPositions)
    })
    it('of peakPosition 6 -> 3 and 6 -> 4', () => {
      let expectedPositions = [
        [
          new Position(2, 1, false),
          new Position(5, 1, true)
        ],[
          new Position(3, 0, false),
          new Position(4, 0, true)
        ]
      ]
      let computedPositions = MMR._mountainPositions(new Position(6, 2, false), 3)
      assert.deepEqual(computedPositions, expectedPositions)
      computedPositions = MMR._mountainPositions(new Position(6, 2, false), 4)
      assert.deepEqual(computedPositions, expectedPositions)
    })
    it('of peakPosition 7 -> 7', () => {
      let expectedPositions = []
      let computedPositions = MMR._mountainPositions(new Position(7, 0, false), 7)
      assert.deepEqual(computedPositions, expectedPositions)
    })
    it('of peakPosition 9 -> 7 and 9 -> 8', () => {
      let expectedPositions = [[
        new Position(7, 0, false),
        new Position(8, 0, true)
      ]]
      let computedPositions = MMR._mountainPositions(new Position(9, 1, false), 7)
      assert.deepEqual(computedPositions, expectedPositions)
      computedPositions = MMR._mountainPositions(new Position(9, 1, false), 8)
      assert.deepEqual(computedPositions, expectedPositions)
    })
    it('of peakPosition 10 -> 10', () => {
      let expectedPositions = []
      let computedPositions = MMR._mountainPositions(new Position(10, 0, false), 10)
      assert.deepEqual(computedPositions, expectedPositions)
    })
    it('of peakPosition 14 -> 3 and 14 -> 4', () => {
      let expectedPositions = [
        [
          new Position(6,  2, false),
          new Position(13, 2, true)
        ], [
          new Position(2, 1, false),
          new Position(5, 1, true)
        ], [
          new Position(3, 0, false),
          new Position(4, 0, true)
        ]
      ]
      let computedPositions = MMR._mountainPositions(new Position(14, 3, false), 3)
      assert.deepEqual(computedPositions, expectedPositions)
      computedPositions = MMR._mountainPositions(new Position(14, 3, false), 4)
      assert.deepEqual(computedPositions, expectedPositions)
    })
    it('of peakPosition 14 -> 7 and 14 -> 8', () => {
      let expectedPositions = [
        [
          new Position(6, 2, false),
          new Position(13, 2, true)
        ], [
          new Position(9, 1, false),
          new Position(12, 1, true)
        ], [
          new Position(7, 0, false),
          new Position(8, 0, true)
        ]
      ]
      let computedPositions = MMR._mountainPositions(new Position(14, 3, false), 7)
      assert.deepEqual(computedPositions, expectedPositions)
      computedPositions = MMR._mountainPositions(new Position(14, 3, false), 8)
      assert.deepEqual(computedPositions, expectedPositions)
    })
    it('of peakPosition 45 -> 31 and 45 -> 32', () => {
      let expectedPositions = [
        [
          new Position(37, 2, false),
          new Position(44, 2, true)
        ], [
          new Position(33, 1, false),
          new Position(36, 1, true)
        ], [
          new Position(31, 0, false),
          new Position(32, 0, true)
        ]
      ]
      let computedPositions = MMR._mountainPositions(new Position(45, 3, false), 31)
      assert.deepEqual(computedPositions, expectedPositions)
      computedPositions = MMR._mountainPositions(new Position(45, 3, false), 32)
      assert.deepEqual(computedPositions, expectedPositions)
    })
    it('of peakPosition 45 -> 34 and 45 -> 35', () => {
      let expectedPositions = [
        [
          new Position(37, 2, false),
          new Position(44, 2, true)
        ], [
          new Position(33, 1, false),
          new Position(36, 1, true)
        ], [
          new Position(34, 0, false),
          new Position(35, 0, true)
        ]
      ]
      let computedPositions = MMR._mountainPositions(new Position(45, 3, false), 34)
      assert.deepEqual(computedPositions, expectedPositions)
      computedPositions = MMR._mountainPositions(new Position(45, 3, false), 35)
      assert.deepEqual(computedPositions, expectedPositions)
    })
    it('of peakPosition 45 -> 38 and 45 -> 39', () => {
      let expectedPositions = [
        [
          new Position(37, 2, false),
          new Position(44, 2, true)
        ], [
          new Position(40, 1, false),
          new Position(43, 1, true)
        ], [
          new Position(38, 0, false),
          new Position(39, 0, true)
        ]
      ]
      let computedPositions = MMR._mountainPositions(new Position(45, 3, false), 38)
      assert.deepEqual(computedPositions, expectedPositions)
      computedPositions = MMR._mountainPositions(new Position(45, 3, false), 39)
      assert.deepEqual(computedPositions, expectedPositions)
    })
    it('of peakPosition 45 -> 41 and 45 -> 42', () => {
      let expectedPositions = [
        [
          new Position(37, 2, false),
          new Position(44, 2, true)
        ], [
          new Position(40, 1, false),
          new Position(43, 1, true)
        ], [
          new Position(41, 0, false),
          new Position(42, 0, true)
        ]
      ]
      let computedPositions = MMR._mountainPositions(new Position(45, 3, false), 41)
      assert.deepEqual(computedPositions, expectedPositions)
      computedPositions = MMR._mountainPositions(new Position(45, 3, false), 42)
      assert.deepEqual(computedPositions, expectedPositions)
    })
    it('of peakPosition 62 -> 22 and 62 -> 23', () => {
      let expectedPositions = [
        [
          new Position(30, 4, false),
          new Position(61, 4, true)
        ],[
          new Position(14, 3, false),
          new Position(29, 3, true)
        ],[
          new Position(21, 2, false),
          new Position(28, 2, true)
        ],[
          new Position(24, 1, false),
          new Position(27, 1, true)
        ],[
          new Position(22, 0, false),
          new Position(23, 0, true)
        ]
      ]
      let computedPositions = MMR._mountainPositions(new Position(62, 5, false), 22)
      assert.deepEqual(computedPositions, expectedPositions)
      computedPositions = MMR._mountainPositions(new Position(62, 5, false), 23)
      assert.deepEqual(computedPositions, expectedPositions)
    })
  })
})

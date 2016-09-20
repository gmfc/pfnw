(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

/*
 * Export kMaxLength after typed array support is determined.
 */
exports.kMaxLength = kMaxLength()

function typedArraySupport () {
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length)
    }
    that.length = length
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype
  return arr
}

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length)
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
  if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    Object.defineProperty(Buffer, Symbol.species, {
      value: null,
      configurable: true
    })
  }
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
}

function allocUnsafe (that, size) {
  assertSize(size)
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  that = createBuffer(that, length)

  var actual = that.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    that = that.slice(0, actual)
  }

  return that
}

function fromArrayLike (that, array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  that = createBuffer(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (byteOffset === undefined && length === undefined) {
    array = new Uint8Array(array)
  } else if (length === undefined) {
    array = new Uint8Array(array, byteOffset)
  } else {
    array = new Uint8Array(array, byteOffset, length)
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array)
  }
  return that
}

function fromObject (that, obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    that = createBuffer(that, len)

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len)
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength()` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (Buffer.TYPED_ARRAY_SUPPORT &&
        typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end)
    newBuf.__proto__ = Buffer.prototype
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start]
    }
  }

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : utf8ToBytes(new Buffer(val, encoding).toString())
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"base64-js":2,"ieee754":3,"isarray":4}],2:[function(require,module,exports){
'use strict'

exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

function init () {
  var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  for (var i = 0, len = code.length; i < len; ++i) {
    lookup[i] = code[i]
    revLookup[code.charCodeAt(i)] = i
  }

  revLookup['-'.charCodeAt(0)] = 62
  revLookup['_'.charCodeAt(0)] = 63
}

init()

function toByteArray (b64) {
  var i, j, l, tmp, placeHolders, arr
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0

  // base64 is 4/3 + up to two characters of the original data
  arr = new Arr(len * 3 / 4 - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],3:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],5:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],6:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],7:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],8:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],9:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":8,"_process":6,"inherits":7}],10:[function(require,module,exports){
// biblioteca de estatistica
var sm = require('simple-statistics');
//  Classe responsavel por administrar e receber os dados da plataforma
//  Faz todos os calculos com os dados da plataforma e gera os valores para o relatorio
function PlatData(a, b, az0) {
    // Deslocamento vertical da plataforma
    if (az0) {
        this.az0 = az0;
    } else {
        this.az0 = 0;
    }
    //Medida centro -> lteral
    if (a) {
        this.a = a;
    } else {
        this.a = 20;
    }
    //Medida centro -> topo
    if (b) {
        this.b = b;
    } else {
        this.b = 20;
    }
    //Medida centro -> topo
    this.b = 1;

    // timestamps
    this.TI = [];
    // arrays de cada sensor
    // top right
    this.TR = [];
    // top left
    this.TL = [];
    // bottom right
    this.BR = [];
    // bottom left
    this.BL = [];

    // Forcas horizontais
    this.FxTRL = [];
    this.FxBLR = [];

    this.FxTBR = [];
    this.FxTBL = [];

    // COP
    this.CPx = [];
    this.CPy = [];

}

// Adiciona dados recebidos como String e adiciona a Arrays
// Split em ';'
// Inicializa TI, TR, TL, BR e BL
PlatData.prototype.pushData = function (data) {
    var arr = data.split(";").map(function (val) {
        return Number(val);
    });
    this.TI.push(arr[0]);
    this.TR.push(arr[1]);
    this.TL.push(arr[2]);
    this.BR.push(arr[3]);
    this.BL.push(arr[4]);
};


// Calcula Centro de pressao (COP) para cada entrada
// Inicializa CPx e CPy. chama calcFx previamente
PlatData.prototype.calcCOP = function () {
    for (var i = 0; i < this.BR.length; i++) {
        var FxTRL = this.TR[i] + this.TL[i];
        var FxBLR = this.BL[i] + this.BR[i];
        var FxTBR = this.TR[i] + this.BR[i];
        var FxTBL = this.TL[i] + this.BL[i];

        this.CPx[i] = fax(this.a, this.TR[i], this.TL[i], this.BL[i], this.BR[i], this.az0, FxTRL, FxBLR);
        this.CPy[i] = fay(this.b, this.TR[i], this.TL[i], this.BL[i], this.BR[i], this.az0, FxTBR, FxTBL);
    }
};


// Calcula o COP para dada String recebida
// Usado para exibir o COP em tempo real
PlatData.prototype.RTCOP = function (data) {
    var arr = data.split(";").map(function (val) {
        return Number(val);
    });
    var TR = arr[1],
        TL = arr[2],
        BR = arr[3],
        BL = arr[4];

    var FxTRL = TR + TL;
    var FxBLR = BL + BR;
    var FxTBR = TR + BR;
    var FxTBL = TL + BL;
    
    var result = {};
    
    /*
    result.x = Efax(this.a, TR, TL, BL, BR, this.az0, FxTRL, FxBLR);
    result.y = Efay(this.b, TR, TL, BL, BR, this.az0, FxTBR, FxTBL);
    //fz1 = TR, fz2 = TL, fz3 = BL, fz4 = BR
    function Efay(b, fz1, fz2, fz3, fz4) {
    */
    
    result.x = Efax(20, TR, TL, BL, BR);
    result.y = Efay(20, TR, TL, BL, BR);
    return result;
}

// Calcula o deslocamento da oscilacao total
// DEPENDE DE calcCOP
PlatData.prototype.calcDOT = function () {
    this.DOT = 0;
    for (var i = 0; i < this.CPx.length; i++) {
        this.DOT += Math.sqrt(Math.pow(this.CPx[i], 2) + Math.pow(this.CPy[i], 2));
    }
}

// Calcula desvio padrao
// DEPENDE DE calcCOP
PlatData.prototype.calcDEV = function () {
    this.DevAP = sm.standardDeviation(this.CPy);
    this.DevML = sm.standardDeviation(this.CPx);
}

// Calcula a raiz do valor quadratico medio
// DEPENDE DE calcCOP
PlatData.prototype.calcRMS = function () {
    this.rmsAP = sm.rootMeanSquare(this.CPy);
    this.rmsML = sm.rootMeanSquare(this.CPx);
}

// Calcula a frequencia da medicao
// PRECISA DOS DADOS EM TI[]
PlatData.prototype.calcFREQ = function () {
    var deltas = [];
    for (var i = 1; i < this.TI.length; i++) {
        deltas.push(this.TI[i] - this.TI[i - 1]);
    }
    this.avgFrq = 1000 / sm.mean(deltas);
}

// Calcula a velocidade media de deslocacao em AP e ML
// chama calcFREQ previamente
PlatData.prototype.calcVEL = function () {
    this.calcFREQ();
    var ApDeslocSum = 0;
    for (var i = 1; i < this.CPy.length; i++) {
        ApDeslocSum += Math.abs(this.CPy[i] - this.CPy[i - 1])
    }
    var MlDeslocSum = 0;
    for (var i = 1; i < this.CPx.length; i++) {
        MlDeslocSum += Math.abs(this.CPx[i] - this.CPx[i - 1])
    }
    this.VMap = (ApDeslocSum * this.avgFrq) / this.CPy.length;
    this.VMml = (MlDeslocSum * this.avgFrq) / this.CPx.length;
}

// Calcula a amplitude de deslocamento em AP e ML
// DEPENDE DE calcCOP
PlatData.prototype.calcAMPL = function () {
    this.ampAP = sm.max(this.CPy) - sm.min(this.CPy);
    this.ampML = sm.max(this.CPx) - sm.min(this.CPx);
}

// Calcula a velocidade de deslocamento
// media total do COP
// chama calcFREQ previamente
PlatData.prototype.calcVELTotal = function () {
    this.calcFREQ();
    var sum = 0;
    for (var i = 1; i < this.CPx.length; i++) {
        sum += Math.sqrt(
            Math.pow(this.CPy[i] - this.CPy[i - 1], 2) +
            Math.pow(this.CPx[i] - this.CPx[i - 1], 2)
        )
    }
    this.VMT = sum * this.avgFrq / this.CPy.length;
}

// Calcula a area preenchida pelo deslocamento do COP
// Utiliza uma oval tracada com base nas medianas das amplitudes em x e y do COP
// DEPENDE DE calcCOP
// 
// Pode ser alterado para tracar um poligono com as coordenadas perifiricas
PlatData.prototype.calcAREA = function () {
    var medianAP = sm.median(this.CPy);
    var medianML = sm.median(this.CPx);
    var deltaAPmin = Math.abs(medianAP - sm.min(this.CPy));
    var deltaAPmax = Math.abs(sm.max(this.CPy) - medianAP);
    var deltaMLmin = Math.abs(medianML - sm.min(this.CPx));
    var deltaMLmax = Math.abs(sm.max(this.CPx) - medianML);
    var deltaAP = (deltaAPmin + deltaAPmax) / 2;
    var deltaML = (deltaMLmin + deltaMLmax) / 2;
    this.area = Math.PI * deltaAP * deltaML;
}

// # HELPERS

// Funcao usada no calculo do COP
// Calcula forca horizontal em X da placa
function fax(a, fz1, fz2, fz3, fz4, az0, fx12, fx34) {
    var t1 = a * (-fz1 + fz2 + fz3 - fz4);
    var t3 = fz1 + fz2 + fz3 + fz4;
    var t2 = az0 * (fx12 + fx34);
    return (-t1 - t2) / t3;
}

// Funcao usada no calculo do COP
// Calcula forca horizontal em Y da placa
function fay(b, fz1, fz2, fz3, fz4, az0, fy14, fy23) {
    var t1 = b * (fz1 + fz2 - fz3 - fz4);
    var t3 = fz1 + fz2 + fz3 + fz4;
    var t2 = az0 * (fy14 + fy23);
    return (t1 + t2) / t3;
}

// experimentais
// Funcao usada no calculo do COP
// Calcula forca horizontal em X da placa
//fz1 = TR, fz2 = TL, fz3 = BL, fz4 = BR
function Efax(a, fz1, fz2, fz3, fz4) {
    var X = a * (fz1 - fz2 - fz3 + fz4)/(fz1+fz2+fz3+fz4);
    return X;
}

// Funcao usada no calculo do COP
// Calcula forca horizontal em Y da placa
//fz1 = TR, fz2 = TL, fz3 = BL, fz4 = BR
function Efay(b, fz1, fz2, fz3, fz4) {
    var Y = b * (fz1 + fz2 - fz3 - fz4)/(fz1+fz2+fz3+fz4);
    return Y;
}

// Exporta a classe
module.exports = PlatData;
},{"simple-statistics":13}],11:[function(require,module,exports){
// biblioteca de acesso serial
var serialLib = require("browser-serialport");
var data = require("./Data.js");
var SerialPort = serialLib.SerialPort;
var port;
var calc = new data(20,20,0);
var acc = '';



function reset() {
    document.getElementById("data").innerHTML = "";
    // Lista as portas conectadas
    var find = false;
    serialLib.list(function (err, ports) {

        ports.forEach(function (port) {
            if (port.manufacturer.indexOf("Arduino") !== -1) {
                if (!find) {
                    document.getElementById("status").innerHTML = port.comName;
                    connect(port.comName);
                }
                find = true;
            }
        });
    });
}

function connect(name) {
    port = new SerialPort(name, {
        baudrate: 9600
    }, true, function () {
        console.log("Conectado");
        console.log(port);
        register();
    });
}



function coleta(dados) {

    acc += dados.toString('utf8');

    var linhas = acc.split('#');

    acc = linhas.pop();
    
    linhas.forEach(function (part) {
        //document.getElementById("data").innerHTML = part + "<br>";
        // browserify ./js/SerialHandler.js -o bundle.js
        document.getElementById("data").innerHTML = "X: " + calc.RTCOP(part).x + " <br>" + "Y: " + calc.RTCOP(part).y;
    });

}


function register() {
    console.log("registrando")
    port.on("data", function (data) {
        coleta(data);
    });
    port.on("close", function (data) {
        document.getElementById("status").innerHTML = "Desconectada";
        port = null;
    });
    port.on("err", function (data) {
        document.getElementById("status").innerHTML = "ERR";
    });
}

var button = document.getElementById('bt');
button.addEventListener('click', reset);


},{"./Data.js":10,"browser-serialport":12}],12:[function(require,module,exports){
(function (process,Buffer){
'use strict';

var EE = require('events').EventEmitter;
var util = require('util');

var DATABITS = [7, 8];
var STOPBITS = [1, 2];
var PARITY = ['none', 'even', 'mark', 'odd', 'space'];
var FLOWCONTROLS = ['RTSCTS'];

var _options = {
  baudrate: 9600,
  parity: 'none',
  rtscts: false,
  databits: 8,
  stopbits: 1,
  buffersize: 256
};

function convertOptions(options){
  switch (options.dataBits) {
    case 7:
      options.dataBits = 'seven';
      break;
    case 8:
      options.dataBits = 'eight';
      break;
  }

  switch (options.stopBits) {
    case 1:
      options.stopBits = 'one';
      break;
    case 2:
      options.stopBits = 'two';
      break;
  }

  switch (options.parity) {
    case 'none':
      options.parity = 'no';
      break;
  }

  return options;
}

function SerialPort(path, options, openImmediately, callback) {

  EE.call(this);

  var self = this;

  var args = Array.prototype.slice.call(arguments);
  callback = args.pop();
  if (typeof(callback) !== 'function') {
    callback = null;
  }

  options = (typeof options !== 'function') && options || {};

  openImmediately = (openImmediately === undefined || openImmediately === null) ? true : openImmediately;

  callback = callback || function (err) {
    if (err) {
      self.emit('error', err);
    }
  };

  var err;

  options.baudRate = options.baudRate || options.baudrate || _options.baudrate;

  options.dataBits = options.dataBits || options.databits || _options.databits;
  if (DATABITS.indexOf(options.dataBits) === -1) {
    err = new Error('Invalid "databits": ' + options.dataBits);
    callback(err);
    return;
  }

  options.stopBits = options.stopBits || options.stopbits || _options.stopbits;
  if (STOPBITS.indexOf(options.stopBits) === -1) {
    err = new Error('Invalid "stopbits": ' + options.stopbits);
    callback(err);
    return;
  }

  options.parity = options.parity || _options.parity;
  if (PARITY.indexOf(options.parity) === -1) {
    err = new Error('Invalid "parity": ' + options.parity);
    callback(err);
    return;
  }

  if (!path) {
    err = new Error('Invalid port specified: ' + path);
    callback(err);
    return;
  }

  options.rtscts = _options.rtscts;

  if (options.flowControl || options.flowcontrol) {
    var fc = options.flowControl || options.flowcontrol;

    if (typeof fc === 'boolean') {
      options.rtscts = true;
    } else {
      var clean = fc.every(function (flowControl) {
        var fcup = flowControl.toUpperCase();
        var idx = FLOWCONTROLS.indexOf(fcup);
        if (idx < 0) {
          var err = new Error('Invalid "flowControl": ' + fcup + '. Valid options: ' + FLOWCONTROLS.join(', '));
          callback(err);
          return false;
        } else {

          // "XON", "XOFF", "XANY", "DTRDTS", "RTSCTS"
          switch (idx) {
            case 0: options.rtscts = true; break;
          }
          return true;
        }
      });
      if(!clean){
        return;
      }
    }
  }

  options.bufferSize = options.bufferSize || options.buffersize || _options.buffersize;

  // defaults to chrome.serial if no options.serial passed
  // inlined instead of on _options to allow mocking global chrome.serial for optional options test
  options.serial = options.serial || (typeof chrome !== 'undefined' && chrome.serial);

  if (!options.serial) {
    throw new Error('No access to serial ports. Try loading as a Chrome Application.');
  }

  this.options = convertOptions(options);

  this.options.serial.onReceiveError.addListener(function(info){

    switch (info.error) {

      case 'disconnected':
      case 'device_lost':
      case 'system_error':
        err = new Error('Disconnected');
        // send notification of disconnect
        if (self.options.disconnectedCallback) {
          self.options.disconnectedCallback(err);
        } else {
          self.emit('disconnect', err);
        }
        if(self.connectionId >= 0){
          self.close();
        }
        break;
      case 'timeout':
        break;
    }

  });

  this.path = path;

  if (openImmediately) {
    process.nextTick(function () {
      self.open(callback);
    });
  }
}

util.inherits(SerialPort, EE);

SerialPort.prototype.connectionId = -1;

SerialPort.prototype.open = function (callback) {
  var options = {
    bitrate: parseInt(this.options.baudRate, 10),
    dataBits: this.options.dataBits,
    parityBit: this.options.parity,
    stopBits: this.options.stopBits,
    ctsFlowControl: this.options.rtscts
  };

  this.options.serial.connect(this.path, options, this.proxy('onOpen', callback));
};

SerialPort.prototype.onOpen = function (callback, openInfo) {
  if(chrome.runtime.lastError){
    if(typeof callback === 'function'){
      callback(chrome.runtime.lastError);
    }else{
      this.emit('error', chrome.runtime.lastError);
    }
    return;
  }

  this.connectionId = openInfo.connectionId;

  if (this.connectionId === -1) {
    this.emit('error', new Error('Could not open port.'));
    return;
  }

  this.emit('open', openInfo);

  this._reader = this.proxy('onRead');

  this.options.serial.onReceive.addListener(this._reader);

  if(typeof callback === 'function'){
    callback(chrome.runtime.lastError, openInfo);
  }
};

SerialPort.prototype.onRead = function (readInfo) {
  if (readInfo && this.connectionId === readInfo.connectionId) {

    if (this.options.dataCallback) {
      this.options.dataCallback(toBuffer(readInfo.data));
    } else {
      this.emit('data', toBuffer(readInfo.data));
    }

  }
};

SerialPort.prototype.write = function (buffer, callback) {
  if (this.connectionId < 0) {
    var err = new Error('Serialport not open.');
    if(typeof callback === 'function'){
      callback(err);
    }else{
      this.emit('error', err);
    }
    return;
  }

  if (typeof buffer === 'string') {
    buffer = str2ab(buffer);
  }

  //Make sure its not a browserify faux Buffer.
  if (buffer instanceof ArrayBuffer === false) {
    buffer = buffer2ArrayBuffer(buffer);
  }

  this.options.serial.send(this.connectionId, buffer, function(info) {
    if (typeof callback === 'function') {
      callback(chrome.runtime.lastError, info);
    }
  });
};


SerialPort.prototype.close = function (callback) {
  if (this.connectionId < 0) {
    var err = new Error('Serialport not open.');
    if(typeof callback === 'function'){
      callback(err);
    }else{
      this.emit('error', err);
    }
    return;
  }

  this.options.serial.disconnect(this.connectionId, this.proxy('onClose', callback));
};

SerialPort.prototype.onClose = function (callback, result) {
  this.connectionId = -1;
  this.emit('close');

  this.removeAllListeners();
  if(this._reader){
    this.options.serial.onReceive.removeListener(this._reader);
    this._reader = null;
  }

  if (typeof callback === 'function') {
    callback(chrome.runtime.lastError, result);
  }
};

SerialPort.prototype.flush = function (callback) {
  if (this.connectionId < 0) {
    var err = new Error('Serialport not open.');
    if(typeof callback === 'function'){
      callback(err);
    }else{
      this.emit('error', err);
    }
    return;
  }

  var self = this;

  this.options.serial.flush(this.connectionId, function(result) {
    if (chrome.runtime.lastError) {
      if (typeof callback === 'function') {
        callback(chrome.runtime.lastError, result);
      } else {
        self.emit('error', chrome.runtime.lastError);
      }
      return;
    } else {
      callback(null, result);
    }
  });
};

SerialPort.prototype.drain = function (callback) {
  if (this.connectionId < 0) {
    var err = new Error('Serialport not open.');
    if(typeof callback === 'function'){
      callback(err);
    }else{
      this.emit('error', err);
    }
    return;
  }

  if (typeof callback === 'function') {
    callback();
  }
};


SerialPort.prototype.proxy = function () {
  var self = this;
  var proxyArgs = [];

  //arguments isnt actually an array.
  for (var i = 0; i < arguments.length; i++) {
      proxyArgs[i] = arguments[i];
  }

  var functionName = proxyArgs.splice(0, 1)[0];

  var func = function() {
    var funcArgs = [];
    for (var i = 0; i < arguments.length; i++) {
        funcArgs[i] = arguments[i];
    }
    var allArgs = proxyArgs.concat(funcArgs);

    self[functionName].apply(self, allArgs);
  };

  return func;
};

SerialPort.prototype.set = function (options, callback) {
  this.options.serial.setControlSignals(this.connectionId, options, function(result){
    callback(chrome.runtime.lastError, result);
  });
};

function SerialPortList(callback) {
  if (typeof chrome != 'undefined' && chrome.serial) {
    chrome.serial.getDevices(function(ports) {
      var portObjects = new Array(ports.length);
      for (var i = 0; i < ports.length; i++) {
        portObjects[i] = {
          comName: ports[i].path,
          manufacturer: ports[i].displayName,
          serialNumber: '',
          pnpId: '',
          locationId:'',
          vendorId: '0x' + (ports[i].vendorId||0).toString(16),
          productId: '0x' + (ports[i].productId||0).toString(16)
        };
      }
      callback(chrome.runtime.lastError, portObjects);
    });
  } else {
    callback(new Error('No access to serial ports. Try loading as a Chrome Application.'), null);
  }
}

// Convert string to ArrayBuffer
function str2ab(str) {
  var buf = new ArrayBuffer(str.length);
  var bufView = new Uint8Array(buf);
  for (var i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

// Convert buffer to ArrayBuffer
function buffer2ArrayBuffer(buffer) {
  var buf = new ArrayBuffer(buffer.length);
  var bufView = new Uint8Array(buf);
  for (var i = 0; i < buffer.length; i++) {
    bufView[i] = buffer[i];
  }
  return buf;
}

function toBuffer(ab) {
  var buffer = new Buffer(ab.byteLength);
  var view = new Uint8Array(ab);
  for (var i = 0; i < buffer.length; ++i) {
      buffer[i] = view[i];
  }
  return buffer;
}

module.exports = {
  SerialPort: SerialPort,
  list: SerialPortList,
  buffer2ArrayBuffer: buffer2ArrayBuffer,
  used: [] //TODO: Populate this somewhere.
};

}).call(this,require('_process'),require("buffer").Buffer)
},{"_process":6,"buffer":1,"events":5,"util":9}],13:[function(require,module,exports){
/* @flow */
'use strict';

// # simple-statistics
//
// A simple, literate statistics system.

var ss = module.exports = {};

// Linear Regression
ss.linearRegression = require('./src/linear_regression');
ss.linearRegressionLine = require('./src/linear_regression_line');
ss.standardDeviation = require('./src/standard_deviation');
ss.rSquared = require('./src/r_squared');
ss.mode = require('./src/mode');
ss.modeSorted = require('./src/mode_sorted');
ss.min = require('./src/min');
ss.max = require('./src/max');
ss.minSorted = require('./src/min_sorted');
ss.maxSorted = require('./src/max_sorted');
ss.sum = require('./src/sum');
ss.sumSimple = require('./src/sum_simple');
ss.product = require('./src/product');
ss.quantile = require('./src/quantile');
ss.quantileSorted = require('./src/quantile_sorted');
ss.iqr = ss.interquartileRange = require('./src/interquartile_range');
ss.medianAbsoluteDeviation = ss.mad = require('./src/median_absolute_deviation');
ss.chunk = require('./src/chunk');
ss.shuffle = require('./src/shuffle');
ss.shuffleInPlace = require('./src/shuffle_in_place');
ss.sample = require('./src/sample');
ss.ckmeans = require('./src/ckmeans');
ss.uniqueCountSorted = require('./src/unique_count_sorted');
ss.sumNthPowerDeviations = require('./src/sum_nth_power_deviations');
ss.equalIntervalBreaks = require('./src/equal_interval_breaks');

// sample statistics
ss.sampleCovariance = require('./src/sample_covariance');
ss.sampleCorrelation = require('./src/sample_correlation');
ss.sampleVariance = require('./src/sample_variance');
ss.sampleStandardDeviation = require('./src/sample_standard_deviation');
ss.sampleSkewness = require('./src/sample_skewness');

// measures of centrality
ss.geometricMean = require('./src/geometric_mean');
ss.harmonicMean = require('./src/harmonic_mean');
ss.mean = ss.average = require('./src/mean');
ss.median = require('./src/median');
ss.medianSorted = require('./src/median_sorted');

ss.rootMeanSquare = ss.rms = require('./src/root_mean_square');
ss.variance = require('./src/variance');
ss.tTest = require('./src/t_test');
ss.tTestTwoSample = require('./src/t_test_two_sample');
// ss.jenks = require('./src/jenks');

// Classifiers
ss.bayesian = require('./src/bayesian_classifier');
ss.perceptron = require('./src/perceptron');

// Distribution-related methods
ss.epsilon = require('./src/epsilon'); // We make ε available to the test suite.
ss.factorial = require('./src/factorial');
ss.bernoulliDistribution = require('./src/bernoulli_distribution');
ss.binomialDistribution = require('./src/binomial_distribution');
ss.poissonDistribution = require('./src/poisson_distribution');
ss.chiSquaredGoodnessOfFit = require('./src/chi_squared_goodness_of_fit');

// Normal distribution
ss.zScore = require('./src/z_score');
ss.cumulativeStdNormalProbability = require('./src/cumulative_std_normal_probability');
ss.standardNormalTable = require('./src/standard_normal_table');
ss.errorFunction = ss.erf = require('./src/error_function');
ss.inverseErrorFunction = require('./src/inverse_error_function');
ss.probit = require('./src/probit');
ss.mixin = require('./src/mixin');

// Root-finding methods
ss.bisect = require('./src/bisect');

},{"./src/bayesian_classifier":14,"./src/bernoulli_distribution":15,"./src/binomial_distribution":16,"./src/bisect":17,"./src/chi_squared_goodness_of_fit":19,"./src/chunk":20,"./src/ckmeans":21,"./src/cumulative_std_normal_probability":22,"./src/epsilon":23,"./src/equal_interval_breaks":24,"./src/error_function":25,"./src/factorial":26,"./src/geometric_mean":27,"./src/harmonic_mean":28,"./src/interquartile_range":29,"./src/inverse_error_function":30,"./src/linear_regression":31,"./src/linear_regression_line":32,"./src/max":33,"./src/max_sorted":34,"./src/mean":35,"./src/median":36,"./src/median_absolute_deviation":37,"./src/median_sorted":38,"./src/min":39,"./src/min_sorted":40,"./src/mixin":41,"./src/mode":42,"./src/mode_sorted":43,"./src/perceptron":45,"./src/poisson_distribution":46,"./src/probit":47,"./src/product":48,"./src/quantile":49,"./src/quantile_sorted":50,"./src/r_squared":52,"./src/root_mean_square":53,"./src/sample":54,"./src/sample_correlation":55,"./src/sample_covariance":56,"./src/sample_skewness":57,"./src/sample_standard_deviation":58,"./src/sample_variance":59,"./src/shuffle":60,"./src/shuffle_in_place":61,"./src/standard_deviation":63,"./src/standard_normal_table":64,"./src/sum":65,"./src/sum_nth_power_deviations":66,"./src/sum_simple":67,"./src/t_test":68,"./src/t_test_two_sample":69,"./src/unique_count_sorted":70,"./src/variance":71,"./src/z_score":72}],14:[function(require,module,exports){
'use strict';
/* @flow */

/**
 * [Bayesian Classifier](http://en.wikipedia.org/wiki/Naive_Bayes_classifier)
 *
 * This is a naïve bayesian classifier that takes
 * singly-nested objects.
 *
 * @class
 * @example
 * var bayes = new BayesianClassifier();
 * bayes.train({
 *   species: 'Cat'
 * }, 'animal');
 * var result = bayes.score({
 *   species: 'Cat'
 * })
 * // result
 * // {
 * //   animal: 1
 * // }
 */
function BayesianClassifier() {
    // The number of items that are currently
    // classified in the model
    this.totalCount = 0;
    // Every item classified in the model
    this.data = {};
}

/**
 * Train the classifier with a new item, which has a single
 * dimension of Javascript literal keys and values.
 *
 * @param {Object} item an object with singly-deep properties
 * @param {string} category the category this item belongs to
 * @return {undefined} adds the item to the classifier
 */
BayesianClassifier.prototype.train = function(item, category) {
    // If the data object doesn't have any values
    // for this category, create a new object for it.
    if (!this.data[category]) {
        this.data[category] = {};
    }

    // Iterate through each key in the item.
    for (var k in item) {
        var v = item[k];
        // Initialize the nested object `data[category][k][item[k]]`
        // with an object of keys that equal 0.
        if (this.data[category][k] === undefined) {
            this.data[category][k] = {};
        }
        if (this.data[category][k][v] === undefined) {
            this.data[category][k][v] = 0;
        }

        // And increment the key for this key/value combination.
        this.data[category][k][item[k]]++;
    }

    // Increment the number of items classified
    this.totalCount++;
};

/**
 * Generate a score of how well this item matches all
 * possible categories based on its attributes
 *
 * @param {Object} item an item in the same format as with train
 * @returns {Object} of probabilities that this item belongs to a
 * given category.
 */
BayesianClassifier.prototype.score = function(item) {
    // Initialize an empty array of odds per category.
    var odds = {}, category;
    // Iterate through each key in the item,
    // then iterate through each category that has been used
    // in previous calls to `.train()`
    for (var k in item) {
        var v = item[k];
        for (category in this.data) {
            // Create an empty object for storing key - value combinations
            // for this category.
            if (odds[category] === undefined) { odds[category] = {}; }

            // If this item doesn't even have a property, it counts for nothing,
            // but if it does have the property that we're looking for from
            // the item to categorize, it counts based on how popular it is
            // versus the whole population.
            if (this.data[category][k]) {
                odds[category][k + '_' + v] = (this.data[category][k][v] || 0) / this.totalCount;
            } else {
                odds[category][k + '_' + v] = 0;
            }
        }
    }

    // Set up a new object that will contain sums of these odds by category
    var oddsSums = {};

    for (category in odds) {
        // Tally all of the odds for each category-combination pair -
        // the non-existence of a category does not add anything to the
        // score.
        for (var combination in odds[category]) {
            if (oddsSums[category] === undefined) {
                oddsSums[category] = 0;
            }
            oddsSums[category] += odds[category][combination];
        }
    }

    return oddsSums;
};

module.exports = BayesianClassifier;

},{}],15:[function(require,module,exports){
'use strict';
/* @flow */

var binomialDistribution = require('./binomial_distribution');

/**
 * The [Bernoulli distribution](http://en.wikipedia.org/wiki/Bernoulli_distribution)
 * is the probability discrete
 * distribution of a random variable which takes value 1 with success
 * probability `p` and value 0 with failure
 * probability `q` = 1 - `p`. It can be used, for example, to represent the
 * toss of a coin, where "1" is defined to mean "heads" and "0" is defined
 * to mean "tails" (or vice versa). It is
 * a special case of a Binomial Distribution
 * where `n` = 1.
 *
 * @param {number} p input value, between 0 and 1 inclusive
 * @returns {number} value of bernoulli distribution at this point
 * @example
 * bernoulliDistribution(0.5); // => { '0': 0.5, '1': 0.5 }
 */
function bernoulliDistribution(p/*: number */) {
    // Check that `p` is a valid probability (0 ≤ p ≤ 1)
    if (p < 0 || p > 1 ) { return NaN; }

    return binomialDistribution(1, p);
}

module.exports = bernoulliDistribution;

},{"./binomial_distribution":16}],16:[function(require,module,exports){
'use strict';
/* @flow */

var epsilon = require('./epsilon');
var factorial = require('./factorial');

/**
 * The [Binomial Distribution](http://en.wikipedia.org/wiki/Binomial_distribution) is the discrete probability
 * distribution of the number of successes in a sequence of n independent yes/no experiments, each of which yields
 * success with probability `probability`. Such a success/failure experiment is also called a Bernoulli experiment or
 * Bernoulli trial; when trials = 1, the Binomial Distribution is a Bernoulli Distribution.
 *
 * @param {number} trials number of trials to simulate
 * @param {number} probability
 * @returns {Object} output
 */
function binomialDistribution(
    trials/*: number */,
    probability/*: number */)/*: ?Object */ {
    // Check that `p` is a valid probability (0 ≤ p ≤ 1),
    // that `n` is an integer, strictly positive.
    if (probability < 0 || probability > 1 ||
        trials <= 0 || trials % 1 !== 0) {
        return undefined;
    }

    // We initialize `x`, the random variable, and `accumulator`, an accumulator
    // for the cumulative distribution function to 0. `distribution_functions`
    // is the object we'll return with the `probability_of_x` and the
    // `cumulativeProbability_of_x`, as well as the calculated mean &
    // variance. We iterate until the `cumulativeProbability_of_x` is
    // within `epsilon` of 1.0.
    var x = 0,
        cumulativeProbability = 0,
        cells = {};

    // This algorithm iterates through each potential outcome,
    // until the `cumulativeProbability` is very close to 1, at
    // which point we've defined the vast majority of outcomes
    do {
        // a [probability mass function](https://en.wikipedia.org/wiki/Probability_mass_function)
        cells[x] = factorial(trials) /
            (factorial(x) * factorial(trials - x)) *
            (Math.pow(probability, x) * Math.pow(1 - probability, trials - x));
        cumulativeProbability += cells[x];
        x++;
    // when the cumulativeProbability is nearly 1, we've calculated
    // the useful range of this distribution
    } while (cumulativeProbability < 1 - epsilon);

    return cells;
}

module.exports = binomialDistribution;

},{"./epsilon":23,"./factorial":26}],17:[function(require,module,exports){
'use strict';
/* @flow */

var sign = require('./sign');
/**
 * [Bisection method](https://en.wikipedia.org/wiki/Bisection_method) is a root-finding 
 * method that repeatedly bisects an interval to find the root.
 * 
 * This function returns a numerical approximation to the exact value.
 * 
 * @param {Function} func input function
 * @param {Number} start - start of interval
 * @param {Number} end - end of interval
 * @param {Number} maxIterations - the maximum number of iterations
 * @param {Number} errorTolerance - the error tolerance
 * @returns {Number} estimated root value
 * @throws {TypeError} Argument func must be a function
 * 
 * @example
 * bisect(Math.cos,0,4,100,0.003); // => 1.572265625
 */
function bisect(
    func/*: (x: any) => number */,
    start/*: number */,
    end/*: number */,
    maxIterations/*: number */,
    errorTolerance/*: number */)/*:number*/ {

    if (typeof func !== 'function') throw new TypeError('func must be a function');
    
    for (var i = 0; i < maxIterations; i++) {
        var output = (start + end) / 2;

        if (func(output) === 0 || Math.abs((end - start) / 2) < errorTolerance) {
            return output;
        }

        if (sign(func(output)) === sign(func(start))) {
            start = output;
        } else {
            end = output;
        }
    }
    
    throw new Error('maximum number of iterations exceeded');
}

module.exports = bisect;

},{"./sign":62}],18:[function(require,module,exports){
'use strict';
/* @flow */

/**
 * **Percentage Points of the χ2 (Chi-Squared) Distribution**
 *
 * The [χ2 (Chi-Squared) Distribution](http://en.wikipedia.org/wiki/Chi-squared_distribution) is used in the common
 * chi-squared tests for goodness of fit of an observed distribution to a theoretical one, the independence of two
 * criteria of classification of qualitative data, and in confidence interval estimation for a population standard
 * deviation of a normal distribution from a sample standard deviation.
 *
 * Values from Appendix 1, Table III of William W. Hines & Douglas C. Montgomery, "Probability and Statistics in
 * Engineering and Management Science", Wiley (1980).
 */
var chiSquaredDistributionTable = { '1':
   { '0.995': 0,
     '0.99': 0,
     '0.975': 0,
     '0.95': 0,
     '0.9': 0.02,
     '0.5': 0.45,
     '0.1': 2.71,
     '0.05': 3.84,
     '0.025': 5.02,
     '0.01': 6.63,
     '0.005': 7.88 },
  '2':
   { '0.995': 0.01,
     '0.99': 0.02,
     '0.975': 0.05,
     '0.95': 0.1,
     '0.9': 0.21,
     '0.5': 1.39,
     '0.1': 4.61,
     '0.05': 5.99,
     '0.025': 7.38,
     '0.01': 9.21,
     '0.005': 10.6 },
  '3':
   { '0.995': 0.07,
     '0.99': 0.11,
     '0.975': 0.22,
     '0.95': 0.35,
     '0.9': 0.58,
     '0.5': 2.37,
     '0.1': 6.25,
     '0.05': 7.81,
     '0.025': 9.35,
     '0.01': 11.34,
     '0.005': 12.84 },
  '4':
   { '0.995': 0.21,
     '0.99': 0.3,
     '0.975': 0.48,
     '0.95': 0.71,
     '0.9': 1.06,
     '0.5': 3.36,
     '0.1': 7.78,
     '0.05': 9.49,
     '0.025': 11.14,
     '0.01': 13.28,
     '0.005': 14.86 },
  '5':
   { '0.995': 0.41,
     '0.99': 0.55,
     '0.975': 0.83,
     '0.95': 1.15,
     '0.9': 1.61,
     '0.5': 4.35,
     '0.1': 9.24,
     '0.05': 11.07,
     '0.025': 12.83,
     '0.01': 15.09,
     '0.005': 16.75 },
  '6':
   { '0.995': 0.68,
     '0.99': 0.87,
     '0.975': 1.24,
     '0.95': 1.64,
     '0.9': 2.2,
     '0.5': 5.35,
     '0.1': 10.65,
     '0.05': 12.59,
     '0.025': 14.45,
     '0.01': 16.81,
     '0.005': 18.55 },
  '7':
   { '0.995': 0.99,
     '0.99': 1.25,
     '0.975': 1.69,
     '0.95': 2.17,
     '0.9': 2.83,
     '0.5': 6.35,
     '0.1': 12.02,
     '0.05': 14.07,
     '0.025': 16.01,
     '0.01': 18.48,
     '0.005': 20.28 },
  '8':
   { '0.995': 1.34,
     '0.99': 1.65,
     '0.975': 2.18,
     '0.95': 2.73,
     '0.9': 3.49,
     '0.5': 7.34,
     '0.1': 13.36,
     '0.05': 15.51,
     '0.025': 17.53,
     '0.01': 20.09,
     '0.005': 21.96 },
  '9':
   { '0.995': 1.73,
     '0.99': 2.09,
     '0.975': 2.7,
     '0.95': 3.33,
     '0.9': 4.17,
     '0.5': 8.34,
     '0.1': 14.68,
     '0.05': 16.92,
     '0.025': 19.02,
     '0.01': 21.67,
     '0.005': 23.59 },
  '10':
   { '0.995': 2.16,
     '0.99': 2.56,
     '0.975': 3.25,
     '0.95': 3.94,
     '0.9': 4.87,
     '0.5': 9.34,
     '0.1': 15.99,
     '0.05': 18.31,
     '0.025': 20.48,
     '0.01': 23.21,
     '0.005': 25.19 },
  '11':
   { '0.995': 2.6,
     '0.99': 3.05,
     '0.975': 3.82,
     '0.95': 4.57,
     '0.9': 5.58,
     '0.5': 10.34,
     '0.1': 17.28,
     '0.05': 19.68,
     '0.025': 21.92,
     '0.01': 24.72,
     '0.005': 26.76 },
  '12':
   { '0.995': 3.07,
     '0.99': 3.57,
     '0.975': 4.4,
     '0.95': 5.23,
     '0.9': 6.3,
     '0.5': 11.34,
     '0.1': 18.55,
     '0.05': 21.03,
     '0.025': 23.34,
     '0.01': 26.22,
     '0.005': 28.3 },
  '13':
   { '0.995': 3.57,
     '0.99': 4.11,
     '0.975': 5.01,
     '0.95': 5.89,
     '0.9': 7.04,
     '0.5': 12.34,
     '0.1': 19.81,
     '0.05': 22.36,
     '0.025': 24.74,
     '0.01': 27.69,
     '0.005': 29.82 },
  '14':
   { '0.995': 4.07,
     '0.99': 4.66,
     '0.975': 5.63,
     '0.95': 6.57,
     '0.9': 7.79,
     '0.5': 13.34,
     '0.1': 21.06,
     '0.05': 23.68,
     '0.025': 26.12,
     '0.01': 29.14,
     '0.005': 31.32 },
  '15':
   { '0.995': 4.6,
     '0.99': 5.23,
     '0.975': 6.27,
     '0.95': 7.26,
     '0.9': 8.55,
     '0.5': 14.34,
     '0.1': 22.31,
     '0.05': 25,
     '0.025': 27.49,
     '0.01': 30.58,
     '0.005': 32.8 },
  '16':
   { '0.995': 5.14,
     '0.99': 5.81,
     '0.975': 6.91,
     '0.95': 7.96,
     '0.9': 9.31,
     '0.5': 15.34,
     '0.1': 23.54,
     '0.05': 26.3,
     '0.025': 28.85,
     '0.01': 32,
     '0.005': 34.27 },
  '17':
   { '0.995': 5.7,
     '0.99': 6.41,
     '0.975': 7.56,
     '0.95': 8.67,
     '0.9': 10.09,
     '0.5': 16.34,
     '0.1': 24.77,
     '0.05': 27.59,
     '0.025': 30.19,
     '0.01': 33.41,
     '0.005': 35.72 },
  '18':
   { '0.995': 6.26,
     '0.99': 7.01,
     '0.975': 8.23,
     '0.95': 9.39,
     '0.9': 10.87,
     '0.5': 17.34,
     '0.1': 25.99,
     '0.05': 28.87,
     '0.025': 31.53,
     '0.01': 34.81,
     '0.005': 37.16 },
  '19':
   { '0.995': 6.84,
     '0.99': 7.63,
     '0.975': 8.91,
     '0.95': 10.12,
     '0.9': 11.65,
     '0.5': 18.34,
     '0.1': 27.2,
     '0.05': 30.14,
     '0.025': 32.85,
     '0.01': 36.19,
     '0.005': 38.58 },
  '20':
   { '0.995': 7.43,
     '0.99': 8.26,
     '0.975': 9.59,
     '0.95': 10.85,
     '0.9': 12.44,
     '0.5': 19.34,
     '0.1': 28.41,
     '0.05': 31.41,
     '0.025': 34.17,
     '0.01': 37.57,
     '0.005': 40 },
  '21':
   { '0.995': 8.03,
     '0.99': 8.9,
     '0.975': 10.28,
     '0.95': 11.59,
     '0.9': 13.24,
     '0.5': 20.34,
     '0.1': 29.62,
     '0.05': 32.67,
     '0.025': 35.48,
     '0.01': 38.93,
     '0.005': 41.4 },
  '22':
   { '0.995': 8.64,
     '0.99': 9.54,
     '0.975': 10.98,
     '0.95': 12.34,
     '0.9': 14.04,
     '0.5': 21.34,
     '0.1': 30.81,
     '0.05': 33.92,
     '0.025': 36.78,
     '0.01': 40.29,
     '0.005': 42.8 },
  '23':
   { '0.995': 9.26,
     '0.99': 10.2,
     '0.975': 11.69,
     '0.95': 13.09,
     '0.9': 14.85,
     '0.5': 22.34,
     '0.1': 32.01,
     '0.05': 35.17,
     '0.025': 38.08,
     '0.01': 41.64,
     '0.005': 44.18 },
  '24':
   { '0.995': 9.89,
     '0.99': 10.86,
     '0.975': 12.4,
     '0.95': 13.85,
     '0.9': 15.66,
     '0.5': 23.34,
     '0.1': 33.2,
     '0.05': 36.42,
     '0.025': 39.36,
     '0.01': 42.98,
     '0.005': 45.56 },
  '25':
   { '0.995': 10.52,
     '0.99': 11.52,
     '0.975': 13.12,
     '0.95': 14.61,
     '0.9': 16.47,
     '0.5': 24.34,
     '0.1': 34.28,
     '0.05': 37.65,
     '0.025': 40.65,
     '0.01': 44.31,
     '0.005': 46.93 },
  '26':
   { '0.995': 11.16,
     '0.99': 12.2,
     '0.975': 13.84,
     '0.95': 15.38,
     '0.9': 17.29,
     '0.5': 25.34,
     '0.1': 35.56,
     '0.05': 38.89,
     '0.025': 41.92,
     '0.01': 45.64,
     '0.005': 48.29 },
  '27':
   { '0.995': 11.81,
     '0.99': 12.88,
     '0.975': 14.57,
     '0.95': 16.15,
     '0.9': 18.11,
     '0.5': 26.34,
     '0.1': 36.74,
     '0.05': 40.11,
     '0.025': 43.19,
     '0.01': 46.96,
     '0.005': 49.65 },
  '28':
   { '0.995': 12.46,
     '0.99': 13.57,
     '0.975': 15.31,
     '0.95': 16.93,
     '0.9': 18.94,
     '0.5': 27.34,
     '0.1': 37.92,
     '0.05': 41.34,
     '0.025': 44.46,
     '0.01': 48.28,
     '0.005': 50.99 },
  '29':
   { '0.995': 13.12,
     '0.99': 14.26,
     '0.975': 16.05,
     '0.95': 17.71,
     '0.9': 19.77,
     '0.5': 28.34,
     '0.1': 39.09,
     '0.05': 42.56,
     '0.025': 45.72,
     '0.01': 49.59,
     '0.005': 52.34 },
  '30':
   { '0.995': 13.79,
     '0.99': 14.95,
     '0.975': 16.79,
     '0.95': 18.49,
     '0.9': 20.6,
     '0.5': 29.34,
     '0.1': 40.26,
     '0.05': 43.77,
     '0.025': 46.98,
     '0.01': 50.89,
     '0.005': 53.67 },
  '40':
   { '0.995': 20.71,
     '0.99': 22.16,
     '0.975': 24.43,
     '0.95': 26.51,
     '0.9': 29.05,
     '0.5': 39.34,
     '0.1': 51.81,
     '0.05': 55.76,
     '0.025': 59.34,
     '0.01': 63.69,
     '0.005': 66.77 },
  '50':
   { '0.995': 27.99,
     '0.99': 29.71,
     '0.975': 32.36,
     '0.95': 34.76,
     '0.9': 37.69,
     '0.5': 49.33,
     '0.1': 63.17,
     '0.05': 67.5,
     '0.025': 71.42,
     '0.01': 76.15,
     '0.005': 79.49 },
  '60':
   { '0.995': 35.53,
     '0.99': 37.48,
     '0.975': 40.48,
     '0.95': 43.19,
     '0.9': 46.46,
     '0.5': 59.33,
     '0.1': 74.4,
     '0.05': 79.08,
     '0.025': 83.3,
     '0.01': 88.38,
     '0.005': 91.95 },
  '70':
   { '0.995': 43.28,
     '0.99': 45.44,
     '0.975': 48.76,
     '0.95': 51.74,
     '0.9': 55.33,
     '0.5': 69.33,
     '0.1': 85.53,
     '0.05': 90.53,
     '0.025': 95.02,
     '0.01': 100.42,
     '0.005': 104.22 },
  '80':
   { '0.995': 51.17,
     '0.99': 53.54,
     '0.975': 57.15,
     '0.95': 60.39,
     '0.9': 64.28,
     '0.5': 79.33,
     '0.1': 96.58,
     '0.05': 101.88,
     '0.025': 106.63,
     '0.01': 112.33,
     '0.005': 116.32 },
  '90':
   { '0.995': 59.2,
     '0.99': 61.75,
     '0.975': 65.65,
     '0.95': 69.13,
     '0.9': 73.29,
     '0.5': 89.33,
     '0.1': 107.57,
     '0.05': 113.14,
     '0.025': 118.14,
     '0.01': 124.12,
     '0.005': 128.3 },
  '100':
   { '0.995': 67.33,
     '0.99': 70.06,
     '0.975': 74.22,
     '0.95': 77.93,
     '0.9': 82.36,
     '0.5': 99.33,
     '0.1': 118.5,
     '0.05': 124.34,
     '0.025': 129.56,
     '0.01': 135.81,
     '0.005': 140.17 } };

module.exports = chiSquaredDistributionTable;

},{}],19:[function(require,module,exports){
'use strict';
/* @flow */

var mean = require('./mean');
var chiSquaredDistributionTable = require('./chi_squared_distribution_table');

/**
 * The [χ2 (Chi-Squared) Goodness-of-Fit Test](http://en.wikipedia.org/wiki/Goodness_of_fit#Pearson.27s_chi-squared_test)
 * uses a measure of goodness of fit which is the sum of differences between observed and expected outcome frequencies
 * (that is, counts of observations), each squared and divided by the number of observations expected given the
 * hypothesized distribution. The resulting χ2 statistic, `chiSquared`, can be compared to the chi-squared distribution
 * to determine the goodness of fit. In order to determine the degrees of freedom of the chi-squared distribution, one
 * takes the total number of observed frequencies and subtracts the number of estimated parameters. The test statistic
 * follows, approximately, a chi-square distribution with (k − c) degrees of freedom where `k` is the number of non-empty
 * cells and `c` is the number of estimated parameters for the distribution.
 *
 * @param {Array<number>} data
 * @param {Function} distributionType a function that returns a point in a distribution:
 * for instance, binomial, bernoulli, or poisson
 * @param {number} significance
 * @returns {number} chi squared goodness of fit
 * @example
 * // Data from Poisson goodness-of-fit example 10-19 in William W. Hines & Douglas C. Montgomery,
 * // "Probability and Statistics in Engineering and Management Science", Wiley (1980).
 * var data1019 = [
 *     0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
 *     0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
 *     1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
 *     2, 2, 2, 2, 2, 2, 2, 2, 2,
 *     3, 3, 3, 3
 * ];
 * ss.chiSquaredGoodnessOfFit(data1019, ss.poissonDistribution, 0.05)); //= false
 */
function chiSquaredGoodnessOfFit(
    data/*: Array<number> */,
    distributionType/*: Function */,
    significance/*: number */)/*: boolean */ {
    // Estimate from the sample data, a weighted mean.
    var inputMean = mean(data),
        // Calculated value of the χ2 statistic.
        chiSquared = 0,
        // Degrees of freedom, calculated as (number of class intervals -
        // number of hypothesized distribution parameters estimated - 1)
        degreesOfFreedom,
        // Number of hypothesized distribution parameters estimated, expected to be supplied in the distribution test.
        // Lose one degree of freedom for estimating `lambda` from the sample data.
        c = 1,
        // The hypothesized distribution.
        // Generate the hypothesized distribution.
        hypothesizedDistribution = distributionType(inputMean),
        observedFrequencies = [],
        expectedFrequencies = [],
        k;

    // Create an array holding a histogram from the sample data, of
    // the form `{ value: numberOfOcurrences }`
    for (var i = 0; i < data.length; i++) {
        if (observedFrequencies[data[i]] === undefined) {
            observedFrequencies[data[i]] = 0;
        }
        observedFrequencies[data[i]]++;
    }

    // The histogram we created might be sparse - there might be gaps
    // between values. So we iterate through the histogram, making
    // sure that instead of undefined, gaps have 0 values.
    for (i = 0; i < observedFrequencies.length; i++) {
        if (observedFrequencies[i] === undefined) {
            observedFrequencies[i] = 0;
        }
    }

    // Create an array holding a histogram of expected data given the
    // sample size and hypothesized distribution.
    for (k in hypothesizedDistribution) {
        if (k in observedFrequencies) {
            expectedFrequencies[+k] = hypothesizedDistribution[k] * data.length;
        }
    }

    // Working backward through the expected frequencies, collapse classes
    // if less than three observations are expected for a class.
    // This transformation is applied to the observed frequencies as well.
    for (k = expectedFrequencies.length - 1; k >= 0; k--) {
        if (expectedFrequencies[k] < 3) {
            expectedFrequencies[k - 1] += expectedFrequencies[k];
            expectedFrequencies.pop();

            observedFrequencies[k - 1] += observedFrequencies[k];
            observedFrequencies.pop();
        }
    }

    // Iterate through the squared differences between observed & expected
    // frequencies, accumulating the `chiSquared` statistic.
    for (k = 0; k < observedFrequencies.length; k++) {
        chiSquared += Math.pow(
            observedFrequencies[k] - expectedFrequencies[k], 2) /
            expectedFrequencies[k];
    }

    // Calculate degrees of freedom for this test and look it up in the
    // `chiSquaredDistributionTable` in order to
    // accept or reject the goodness-of-fit of the hypothesized distribution.
    degreesOfFreedom = observedFrequencies.length - c - 1;
    return chiSquaredDistributionTable[degreesOfFreedom][significance] < chiSquared;
}

module.exports = chiSquaredGoodnessOfFit;

},{"./chi_squared_distribution_table":18,"./mean":35}],20:[function(require,module,exports){
'use strict';
/* @flow */

/**
 * Split an array into chunks of a specified size. This function
 * has the same behavior as [PHP's array_chunk](http://php.net/manual/en/function.array-chunk.php)
 * function, and thus will insert smaller-sized chunks at the end if
 * the input size is not divisible by the chunk size.
 *
 * `sample` is expected to be an array, and `chunkSize` a number.
 * The `sample` array can contain any kind of data.
 *
 * @param {Array} sample any array of values
 * @param {number} chunkSize size of each output array
 * @returns {Array<Array>} a chunked array
 * @example
 * chunk([1, 2, 3, 4], 2);
 * // => [[1, 2], [3, 4]]
 */
function chunk(sample/*:Array<any>*/, chunkSize/*:number*/)/*:?Array<Array<any>>*/ {

    // a list of result chunks, as arrays in an array
    var output = [];

    // `chunkSize` must be zero or higher - otherwise the loop below,
    // in which we call `start += chunkSize`, will loop infinitely.
    // So, we'll detect and throw in that case to indicate
    // invalid input.
    if (chunkSize <= 0) {
        throw new Error('chunk size must be a positive integer');
    }

    // `start` is the index at which `.slice` will start selecting
    // new array elements
    for (var start = 0; start < sample.length; start += chunkSize) {

        // for each chunk, slice that part of the array and add it
        // to the output. The `.slice` function does not change
        // the original array.
        output.push(sample.slice(start, start + chunkSize));
    }
    return output;
}

module.exports = chunk;

},{}],21:[function(require,module,exports){
'use strict';
/* @flow */

var uniqueCountSorted = require('./unique_count_sorted'),
    numericSort = require('./numeric_sort');

/**
 * Create a new column x row matrix.
 *
 * @private
 * @param {number} columns
 * @param {number} rows
 * @return {Array<Array<number>>} matrix
 * @example
 * makeMatrix(10, 10);
 */
function makeMatrix(columns, rows) {
    var matrix = [];
    for (var i = 0; i < columns; i++) {
        var column = [];
        for (var j = 0; j < rows; j++) {
            column.push(0);
        }
        matrix.push(column);
    }
    return matrix;
}

/**
 * Ckmeans clustering is an improvement on heuristic-based clustering
 * approaches like Jenks. The algorithm was developed in
 * [Haizhou Wang and Mingzhou Song](http://journal.r-project.org/archive/2011-2/RJournal_2011-2_Wang+Song.pdf)
 * as a [dynamic programming](https://en.wikipedia.org/wiki/Dynamic_programming) approach
 * to the problem of clustering numeric data into groups with the least
 * within-group sum-of-squared-deviations.
 *
 * Minimizing the difference within groups - what Wang & Song refer to as
 * `withinss`, or within sum-of-squares, means that groups are optimally
 * homogenous within and the data is split into representative groups.
 * This is very useful for visualization, where you may want to represent
 * a continuous variable in discrete color or style groups. This function
 * can provide groups that emphasize differences between data.
 *
 * Being a dynamic approach, this algorithm is based on two matrices that
 * store incrementally-computed values for squared deviations and backtracking
 * indexes.
 *
 * Unlike the [original implementation](https://cran.r-project.org/web/packages/Ckmeans.1d.dp/index.html),
 * this implementation does not include any code to automatically determine
 * the optimal number of clusters: this information needs to be explicitly
 * provided.
 *
 * ### References
 * _Ckmeans.1d.dp: Optimal k-means Clustering in One Dimension by Dynamic
 * Programming_ Haizhou Wang and Mingzhou Song ISSN 2073-4859
 *
 * from The R Journal Vol. 3/2, December 2011
 * @param {Array<number>} data input data, as an array of number values
 * @param {number} nClusters number of desired classes. This cannot be
 * greater than the number of values in the data array.
 * @returns {Array<Array<number>>} clustered input
 * @example
 * ckmeans([-1, 2, -1, 2, 4, 5, 6, -1, 2, -1], 3);
 * // The input, clustered into groups of similar numbers.
 * //= [[-1, -1, -1, -1], [2, 2, 2], [4, 5, 6]]);
 */
function ckmeans(data/*: Array<number> */, nClusters/*: number */)/*: Array<Array<number>> */ {

    if (nClusters > data.length) {
        throw new Error('Cannot generate more classes than there are data values');
    }

    var sorted = numericSort(data),
        // we'll use this as the maximum number of clusters
        uniqueCount = uniqueCountSorted(sorted);

    // if all of the input values are identical, there's one cluster
    // with all of the input in it.
    if (uniqueCount === 1) {
        return [sorted];
    }

    // named 'D' originally
    var matrix = makeMatrix(nClusters, sorted.length),
        // named 'B' originally
        backtrackMatrix = makeMatrix(nClusters, sorted.length);

    // This is a dynamic programming way to solve the problem of minimizing
    // within-cluster sum of squares. It's similar to linear regression
    // in this way, and this calculation incrementally computes the
    // sum of squares that are later read.

    // The outer loop iterates through clusters, from 0 to nClusters.
    for (var cluster = 0; cluster < nClusters; cluster++) {

        // At the start of each loop, the mean starts as the first element
        var firstClusterMean = sorted[0];

        for (var sortedIdx = Math.max(cluster, 1);
             sortedIdx < sorted.length;
             sortedIdx++) {

            if (cluster === 0) {

                // Increase the running sum of squares calculation by this
                // new value
                var squaredDifference = Math.pow(
                    sorted[sortedIdx] - firstClusterMean, 2);
                matrix[cluster][sortedIdx] = matrix[cluster][sortedIdx - 1] +
                    (sortedIdx / (sortedIdx + 1)) * squaredDifference;

                // We're computing a running mean by taking the previous
                // mean value, multiplying it by the number of elements
                // seen so far, and then dividing it by the number of
                // elements total.
                var newSum = sortedIdx * firstClusterMean + sorted[sortedIdx];
                firstClusterMean = newSum / (sortedIdx + 1);

            } else {

                var sumSquaredDistances = 0,
                    meanXJ = 0;

                for (var j = sortedIdx; j >= cluster; j--) {

                    sumSquaredDistances += (sortedIdx - j) /
                        (sortedIdx - j + 1) *
                        Math.pow(sorted[j] - meanXJ, 2);

                    meanXJ = (sorted[j] + (sortedIdx - j) * meanXJ) /
                        (sortedIdx - j + 1);

                    if (j === sortedIdx) {
                        matrix[cluster][sortedIdx] = sumSquaredDistances;
                        backtrackMatrix[cluster][sortedIdx] = j;
                        if (j > 0) {
                            matrix[cluster][sortedIdx] += matrix[cluster - 1][j - 1];
                        }
                    } else {
                        if (j === 0) {
                            if (sumSquaredDistances <= matrix[cluster][sortedIdx]) {
                                matrix[cluster][sortedIdx] = sumSquaredDistances;
                                backtrackMatrix[cluster][sortedIdx] = j;
                            }
                        } else if (sumSquaredDistances + matrix[cluster - 1][j - 1] < matrix[cluster][sortedIdx]) {
                            matrix[cluster][sortedIdx] = sumSquaredDistances + matrix[cluster - 1][j - 1];
                            backtrackMatrix[cluster][sortedIdx] = j;
                        }
                    }
                }
            }
        }
    }

    // The real work of Ckmeans clustering happens in the matrix generation:
    // the generated matrices encode all possible clustering combinations, and
    // once they're generated we can solve for the best clustering groups
    // very quickly.
    var clusters = [],
        clusterRight = backtrackMatrix[0].length - 1;

    // Backtrack the clusters from the dynamic programming matrix. This
    // starts at the bottom-right corner of the matrix (if the top-left is 0, 0),
    // and moves the cluster target with the loop.
    for (cluster = backtrackMatrix.length - 1; cluster >= 0; cluster--) {

        var clusterLeft = backtrackMatrix[cluster][clusterRight];

        // fill the cluster from the sorted input by taking a slice of the
        // array. the backtrack matrix makes this easy - it stores the
        // indexes where the cluster should start and end.
        clusters[cluster] = sorted.slice(clusterLeft, clusterRight + 1);

        if (cluster > 0) {
            clusterRight = clusterLeft - 1;
        }
    }

    return clusters;
}

module.exports = ckmeans;

},{"./numeric_sort":44,"./unique_count_sorted":70}],22:[function(require,module,exports){
'use strict';
/* @flow */

var standardNormalTable = require('./standard_normal_table');

/**
 * **[Cumulative Standard Normal Probability](http://en.wikipedia.org/wiki/Standard_normal_table)**
 *
 * Since probability tables cannot be
 * printed for every normal distribution, as there are an infinite variety
 * of normal distributions, it is common practice to convert a normal to a
 * standard normal and then use the standard normal table to find probabilities.
 *
 * You can use `.5 + .5 * errorFunction(x / Math.sqrt(2))` to calculate the probability
 * instead of looking it up in a table.
 *
 * @param {number} z
 * @returns {number} cumulative standard normal probability
 */
function cumulativeStdNormalProbability(z /*:number */)/*:number */ {

    // Calculate the position of this value.
    var absZ = Math.abs(z),
        // Each row begins with a different
        // significant digit: 0.5, 0.6, 0.7, and so on. Each value in the table
        // corresponds to a range of 0.01 in the input values, so the value is
        // multiplied by 100.
        index = Math.min(Math.round(absZ * 100), standardNormalTable.length - 1);

    // The index we calculate must be in the table as a positive value,
    // but we still pay attention to whether the input is positive
    // or negative, and flip the output value as a last step.
    if (z >= 0) {
        return standardNormalTable[index];
    } else {
        // due to floating-point arithmetic, values in the table with
        // 4 significant figures can nevertheless end up as repeating
        // fractions when they're computed here.
        return +(1 - standardNormalTable[index]).toFixed(4);
    }
}

module.exports = cumulativeStdNormalProbability;

},{"./standard_normal_table":64}],23:[function(require,module,exports){
'use strict';
/* @flow */

/**
 * We use `ε`, epsilon, as a stopping criterion when we want to iterate
 * until we're "close enough". Epsilon is a very small number: for
 * simple statistics, that number is **0.0001**
 *
 * This is used in calculations like the binomialDistribution, in which
 * the process of finding a value is [iterative](https://en.wikipedia.org/wiki/Iterative_method):
 * it progresses until it is close enough.
 *
 * Below is an example of using epsilon in [gradient descent](https://en.wikipedia.org/wiki/Gradient_descent),
 * where we're trying to find a local minimum of a function's derivative,
 * given by the `fDerivative` method.
 *
 * @example
 * // From calculation, we expect that the local minimum occurs at x=9/4
 * var x_old = 0;
 * // The algorithm starts at x=6
 * var x_new = 6;
 * var stepSize = 0.01;
 *
 * function fDerivative(x) {
 *   return 4 * Math.pow(x, 3) - 9 * Math.pow(x, 2);
 * }
 *
 * // The loop runs until the difference between the previous
 * // value and the current value is smaller than epsilon - a rough
 * // meaure of 'close enough'
 * while (Math.abs(x_new - x_old) > ss.epsilon) {
 *   x_old = x_new;
 *   x_new = x_old - stepSize * fDerivative(x_old);
 * }
 *
 * console.log('Local minimum occurs at', x_new);
 */
var epsilon = 0.0001;

module.exports = epsilon;

},{}],24:[function(require,module,exports){
'use strict';
/* @flow */

var max = require('./max'),
    min = require('./min');

/**
 * Given an array of data, this will find the extent of the
 * data and return an array of breaks that can be used
 * to categorize the data into a number of classes. The
 * returned array will always be 1 longer than the number of
 * classes because it includes the minimum value.
 *
 * @param {Array<number>} data input data, as an array of number values
 * @param {number} nClasses number of desired classes
 * @returns {Array<number>} array of class break positions
 * @example
 * equalIntervalBreaks([1, 2, 3, 4, 5, 6], 4); //= [1, 2.25, 3.5, 4.75, 6]
 */
function equalIntervalBreaks(data/*: Array<number> */, nClasses/*:number*/)/*: Array<number> */ {

    if (data.length <= 1) {
        return data;
    }

    var theMin = min(data),
        theMax = max(data); 

    // the first break will always be the minimum value
    // in the dataset
    var breaks = [theMin];

    // The size of each break is the full range of the data
    // divided by the number of classes requested
    var breakSize = (theMax - theMin) / nClasses;

    // In the case of nClasses = 1, this loop won't run
    // and the returned breaks will be [min, max]
    for (var i = 1; i < nClasses; i++) {
        breaks.push(breaks[0] + breakSize * i);
    }

    // the last break will always be the
    // maximum.
    breaks.push(theMax);

    return breaks;
}

module.exports = equalIntervalBreaks;

},{"./max":33,"./min":39}],25:[function(require,module,exports){
'use strict';
/* @flow */

/**
 * **[Gaussian error function](http://en.wikipedia.org/wiki/Error_function)**
 *
 * The `errorFunction(x/(sd * Math.sqrt(2)))` is the probability that a value in a
 * normal distribution with standard deviation sd is within x of the mean.
 *
 * This function returns a numerical approximation to the exact value.
 *
 * @param {number} x input
 * @return {number} error estimation
 * @example
 * errorFunction(1).toFixed(2); // => '0.84'
 */
function errorFunction(x/*: number */)/*: number */ {
    var t = 1 / (1 + 0.5 * Math.abs(x));
    var tau = t * Math.exp(-Math.pow(x, 2) -
        1.26551223 +
        1.00002368 * t +
        0.37409196 * Math.pow(t, 2) +
        0.09678418 * Math.pow(t, 3) -
        0.18628806 * Math.pow(t, 4) +
        0.27886807 * Math.pow(t, 5) -
        1.13520398 * Math.pow(t, 6) +
        1.48851587 * Math.pow(t, 7) -
        0.82215223 * Math.pow(t, 8) +
        0.17087277 * Math.pow(t, 9));
    if (x >= 0) {
        return 1 - tau;
    } else {
        return tau - 1;
    }
}

module.exports = errorFunction;

},{}],26:[function(require,module,exports){
'use strict';
/* @flow */

/**
 * A [Factorial](https://en.wikipedia.org/wiki/Factorial), usually written n!, is the product of all positive
 * integers less than or equal to n. Often factorial is implemented
 * recursively, but this iterative approach is significantly faster
 * and simpler.
 *
 * @param {number} n input
 * @returns {number} factorial: n!
 * @example
 * factorial(5); // => 120
 */
function factorial(n /*: number */)/*: number */ {

    // factorial is mathematically undefined for negative numbers
    if (n < 0) { return NaN; }

    // typically you'll expand the factorial function going down, like
    // 5! = 5 * 4 * 3 * 2 * 1. This is going in the opposite direction,
    // counting from 2 up to the number in question, and since anything
    // multiplied by 1 is itself, the loop only needs to start at 2.
    var accumulator = 1;
    for (var i = 2; i <= n; i++) {
        // for each number up to and including the number `n`, multiply
        // the accumulator my that number.
        accumulator *= i;
    }
    return accumulator;
}

module.exports = factorial;

},{}],27:[function(require,module,exports){
'use strict';
/* @flow */

/**
 * The [Geometric Mean](https://en.wikipedia.org/wiki/Geometric_mean) is
 * a mean function that is more useful for numbers in different
 * ranges.
 *
 * This is the nth root of the input numbers multiplied by each other.
 *
 * The geometric mean is often useful for
 * **[proportional growth](https://en.wikipedia.org/wiki/Geometric_mean#Proportional_growth)**: given
 * growth rates for multiple years, like _80%, 16.66% and 42.85%_, a simple
 * mean will incorrectly estimate an average growth rate, whereas a geometric
 * mean will correctly estimate a growth rate that, over those years,
 * will yield the same end value.
 *
 * This runs on `O(n)`, linear time in respect to the array
 *
 * @param {Array<number>} x input array
 * @returns {number} geometric mean
 * @example
 * var growthRates = [1.80, 1.166666, 1.428571];
 * var averageGrowth = geometricMean(growthRates);
 * var averageGrowthRates = [averageGrowth, averageGrowth, averageGrowth];
 * var startingValue = 10;
 * var startingValueMean = 10;
 * growthRates.forEach(function(rate) {
 *   startingValue *= rate;
 * });
 * averageGrowthRates.forEach(function(rate) {
 *   startingValueMean *= rate;
 * });
 * startingValueMean === startingValue;
 */
function geometricMean(x /*: Array<number> */) {
    // The mean of no numbers is null
    if (x.length === 0) { return undefined; }

    // the starting value.
    var value = 1;

    for (var i = 0; i < x.length; i++) {
        // the geometric mean is only valid for positive numbers
        if (x[i] <= 0) { return undefined; }

        // repeatedly multiply the value by each number
        value *= x[i];
    }

    return Math.pow(value, 1 / x.length);
}

module.exports = geometricMean;

},{}],28:[function(require,module,exports){
'use strict';
/* @flow */

/**
 * The [Harmonic Mean](https://en.wikipedia.org/wiki/Harmonic_mean) is
 * a mean function typically used to find the average of rates.
 * This mean is calculated by taking the reciprocal of the arithmetic mean
 * of the reciprocals of the input numbers.
 *
 * This is a [measure of central tendency](https://en.wikipedia.org/wiki/Central_tendency):
 * a method of finding a typical or central value of a set of numbers.
 *
 * This runs on `O(n)`, linear time in respect to the array.
 *
 * @param {Array<number>} x input
 * @returns {number} harmonic mean
 * @example
 * harmonicMean([2, 3]).toFixed(2) // => '2.40'
 */
function harmonicMean(x /*: Array<number> */) {
    // The mean of no numbers is null
    if (x.length === 0) { return undefined; }

    var reciprocalSum = 0;

    for (var i = 0; i < x.length; i++) {
        // the harmonic mean is only valid for positive numbers
        if (x[i] <= 0) { return undefined; }

        reciprocalSum += 1 / x[i];
    }

    // divide n by the the reciprocal sum
    return x.length / reciprocalSum;
}

module.exports = harmonicMean;

},{}],29:[function(require,module,exports){
'use strict';
/* @flow */

var quantile = require('./quantile');

/**
 * The [Interquartile range](http://en.wikipedia.org/wiki/Interquartile_range) is
 * a measure of statistical dispersion, or how scattered, spread, or
 * concentrated a distribution is. It's computed as the difference between
 * the third quartile and first quartile.
 *
 * @param {Array<number>} sample
 * @returns {number} interquartile range: the span between lower and upper quartile,
 * 0.25 and 0.75
 * @example
 * interquartileRange([0, 1, 2, 3]); // => 2
 */
function interquartileRange(sample/*: Array<number> */) {
    // Interquartile range is the span between the upper quartile,
    // at `0.75`, and lower quartile, `0.25`
    var q1 = quantile(sample, 0.75),
        q2 = quantile(sample, 0.25);

    if (typeof q1 === 'number' && typeof q2 === 'number') {
        return q1 - q2;
    }
}

module.exports = interquartileRange;

},{"./quantile":49}],30:[function(require,module,exports){
'use strict';
/* @flow */

/**
 * The Inverse [Gaussian error function](http://en.wikipedia.org/wiki/Error_function)
 * returns a numerical approximation to the value that would have caused
 * `errorFunction()` to return x.
 *
 * @param {number} x value of error function
 * @returns {number} estimated inverted value
 */
function inverseErrorFunction(x/*: number */)/*: number */ {
    var a = (8 * (Math.PI - 3)) / (3 * Math.PI * (4 - Math.PI));

    var inv = Math.sqrt(Math.sqrt(
        Math.pow(2 / (Math.PI * a) + Math.log(1 - x * x) / 2, 2) -
        Math.log(1 - x * x) / a) -
        (2 / (Math.PI * a) + Math.log(1 - x * x) / 2));

    if (x >= 0) {
        return inv;
    } else {
        return -inv;
    }
}

module.exports = inverseErrorFunction;

},{}],31:[function(require,module,exports){
'use strict';
/* @flow */

/**
 * [Simple linear regression](http://en.wikipedia.org/wiki/Simple_linear_regression)
 * is a simple way to find a fitted line
 * between a set of coordinates. This algorithm finds the slope and y-intercept of a regression line
 * using the least sum of squares.
 *
 * @param {Array<Array<number>>} data an array of two-element of arrays,
 * like `[[0, 1], [2, 3]]`
 * @returns {Object} object containing slope and intersect of regression line
 * @example
 * linearRegression([[0, 0], [1, 1]]); // => { m: 1, b: 0 }
 */
function linearRegression(data/*: Array<Array<number>> */)/*: { m: number, b: number } */ {

    var m, b;

    // Store data length in a local variable to reduce
    // repeated object property lookups
    var dataLength = data.length;

    //if there's only one point, arbitrarily choose a slope of 0
    //and a y-intercept of whatever the y of the initial point is
    if (dataLength === 1) {
        m = 0;
        b = data[0][1];
    } else {
        // Initialize our sums and scope the `m` and `b`
        // variables that define the line.
        var sumX = 0, sumY = 0,
            sumXX = 0, sumXY = 0;

        // Use local variables to grab point values
        // with minimal object property lookups
        var point, x, y;

        // Gather the sum of all x values, the sum of all
        // y values, and the sum of x^2 and (x*y) for each
        // value.
        //
        // In math notation, these would be SS_x, SS_y, SS_xx, and SS_xy
        for (var i = 0; i < dataLength; i++) {
            point = data[i];
            x = point[0];
            y = point[1];

            sumX += x;
            sumY += y;

            sumXX += x * x;
            sumXY += x * y;
        }

        // `m` is the slope of the regression line
        m = ((dataLength * sumXY) - (sumX * sumY)) /
            ((dataLength * sumXX) - (sumX * sumX));

        // `b` is the y-intercept of the line.
        b = (sumY / dataLength) - ((m * sumX) / dataLength);
    }

    // Return both values as an object.
    return {
        m: m,
        b: b
    };
}


module.exports = linearRegression;

},{}],32:[function(require,module,exports){
'use strict';
/* @flow */

/**
 * Given the output of `linearRegression`: an object
 * with `m` and `b` values indicating slope and intercept,
 * respectively, generate a line function that translates
 * x values into y values.
 *
 * @param {Object} mb object with `m` and `b` members, representing
 * slope and intersect of desired line
 * @returns {Function} method that computes y-value at any given
 * x-value on the line.
 * @example
 * var l = linearRegressionLine(linearRegression([[0, 0], [1, 1]]));
 * l(0) // = 0
 * l(2) // = 2
 * linearRegressionLine({ b: 0, m: 1 })(1); // => 1
 * linearRegressionLine({ b: 1, m: 1 })(1); // => 2
 */
function linearRegressionLine(mb/*: { b: number, m: number }*/)/*: Function */ {
    // Return a function that computes a `y` value for each
    // x value it is given, based on the values of `b` and `a`
    // that we just computed.
    return function(x) {
        return mb.b + (mb.m * x);
    };
}

module.exports = linearRegressionLine;

},{}],33:[function(require,module,exports){
'use strict';
/* @flow */

/**
 * This computes the maximum number in an array.
 *
 * This runs on `O(n)`, linear time in respect to the array
 *
 * @param {Array<number>} x input
 * @returns {number} maximum value
 * @example
 * max([1, 2, 3, 4]);
 * // => 4
 */
function max(x /*: Array<number> */) /*:number*/ {
    var value;
    for (var i = 0; i < x.length; i++) {
        // On the first iteration of this loop, max is
        // NaN and is thus made the maximum element in the array
        if (value === undefined || x[i] > value) {
            value = x[i];
        }
    }
    if (value === undefined) {
        return NaN;
    }
    return value;
}

module.exports = max;

},{}],34:[function(require,module,exports){
'use strict';
/* @flow */

/**
 * The maximum is the highest number in the array. With a sorted array,
 * the last element in the array is always the largest, so this calculation
 * can be done in one step, or constant time.
 *
 * @param {Array<number>} x input
 * @returns {number} maximum value
 * @example
 * maxSorted([-100, -10, 1, 2, 5]); // => 5
 */
function maxSorted(x /*: Array<number> */)/*:number*/ {
    return x[x.length - 1];
}

module.exports = maxSorted;

},{}],35:[function(require,module,exports){
'use strict';
/* @flow */

var sum = require('./sum');

/**
 * The mean, _also known as average_,
 * is the sum of all values over the number of values.
 * This is a [measure of central tendency](https://en.wikipedia.org/wiki/Central_tendency):
 * a method of finding a typical or central value of a set of numbers.
 *
 * This runs on `O(n)`, linear time in respect to the array
 *
 * @param {Array<number>} x input values
 * @returns {number} mean
 * @example
 * mean([0, 10]); // => 5
 */
function mean(x /*: Array<number> */)/*:number*/ {
    // The mean of no numbers is null
    if (x.length === 0) { return NaN; }

    return sum(x) / x.length;
}

module.exports = mean;

},{"./sum":65}],36:[function(require,module,exports){
'use strict';
/* @flow */

var quantile = require('./quantile');

/**
 * The [median](http://en.wikipedia.org/wiki/Median) is
 * the middle number of a list. This is often a good indicator of 'the middle'
 * when there are outliers that skew the `mean()` value.
 * This is a [measure of central tendency](https://en.wikipedia.org/wiki/Central_tendency):
 * a method of finding a typical or central value of a set of numbers.
 *
 * The median isn't necessarily one of the elements in the list: the value
 * can be the average of two elements if the list has an even length
 * and the two central values are different.
 *
 * @param {Array<number>} x input
 * @returns {number} median value
 * @example
 * median([10, 2, 5, 100, 2, 1]); // => 3.5
 */
function median(x /*: Array<number> */)/*:number*/ {
    return +quantile(x, 0.5);
}

module.exports = median;

},{"./quantile":49}],37:[function(require,module,exports){
'use strict';
/* @flow */

var median = require('./median');

/**
 * The [Median Absolute Deviation](http://en.wikipedia.org/wiki/Median_absolute_deviation) is
 * a robust measure of statistical
 * dispersion. It is more resilient to outliers than the standard deviation.
 *
 * @param {Array<number>} x input array
 * @returns {number} median absolute deviation
 * @example
 * medianAbsoluteDeviation([1, 1, 2, 2, 4, 6, 9]); // => 1
 */
function medianAbsoluteDeviation(x /*: Array<number> */) {
    // The mad of nothing is null
    var medianValue = median(x),
        medianAbsoluteDeviations = [];

    // Make a list of absolute deviations from the median
    for (var i = 0; i < x.length; i++) {
        medianAbsoluteDeviations.push(Math.abs(x[i] - medianValue));
    }

    // Find the median value of that list
    return median(medianAbsoluteDeviations);
}

module.exports = medianAbsoluteDeviation;

},{"./median":36}],38:[function(require,module,exports){
'use strict';
/* @flow */

var quantileSorted = require('./quantile_sorted');

/**
 * The [median](http://en.wikipedia.org/wiki/Median) is
 * the middle number of a list. This is often a good indicator of 'the middle'
 * when there are outliers that skew the `mean()` value.
 * This is a [measure of central tendency](https://en.wikipedia.org/wiki/Central_tendency):
 * a method of finding a typical or central value of a set of numbers.
 *
 * The median isn't necessarily one of the elements in the list: the value
 * can be the average of two elements if the list has an even length
 * and the two central values are different.
 *
 * @param {Array<number>} sorted input
 * @returns {number} median value
 * @example
 * medianSorted([10, 2, 5, 100, 2, 1]); // => 52.5
 */
function medianSorted(sorted /*: Array<number> */)/*:number*/ {
    return quantileSorted(sorted, 0.5);
}

module.exports = medianSorted;

},{"./quantile_sorted":50}],39:[function(require,module,exports){
'use strict';
/* @flow */

/**
 * The min is the lowest number in the array. This runs on `O(n)`, linear time in respect to the array
 *
 * @param {Array<number>} x input
 * @returns {number} minimum value
 * @example
 * min([1, 5, -10, 100, 2]); // => -10
 */
function min(x /*: Array<number> */)/*:number*/ {
    var value;
    for (var i = 0; i < x.length; i++) {
        // On the first iteration of this loop, min is
        // NaN and is thus made the minimum element in the array
        if (value === undefined || x[i] < value) {
            value = x[i];
        }
    }
    if (value === undefined) {
        return NaN;
    }
    return value;
}

module.exports = min;

},{}],40:[function(require,module,exports){
'use strict';
/* @flow */

/**
 * The minimum is the lowest number in the array. With a sorted array,
 * the first element in the array is always the smallest, so this calculation
 * can be done in one step, or constant time.
 *
 * @param {Array<number>} x input
 * @returns {number} minimum value
 * @example
 * minSorted([-100, -10, 1, 2, 5]); // => -100
 */
function minSorted(x /*: Array<number> */)/*:number*/ {
    return x[0];
}

module.exports = minSorted;

},{}],41:[function(require,module,exports){
'use strict';
/* @flow */

/**
 * **Mixin** simple_statistics to a single Array instance if provided
 * or the Array native object if not. This is an optional
 * feature that lets you treat simple_statistics as a native feature
 * of Javascript.
 *
 * @param {Object} ss simple statistics
 * @param {Array} [array=] a single array instance which will be augmented
 * with the extra methods. If omitted, mixin will apply to all arrays
 * by changing the global `Array.prototype`.
 * @returns {*} the extended Array, or Array.prototype if no object
 * is given.
 *
 * @example
 * var myNumbers = [1, 2, 3];
 * mixin(ss, myNumbers);
 * console.log(myNumbers.sum()); // 6
 */
function mixin(ss /*: Object */, array /*: ?Array<any> */)/*: any */ {
    var support = !!(Object.defineProperty && Object.defineProperties);
    // Coverage testing will never test this error.
    /* istanbul ignore next */
    if (!support) {
        throw new Error('without defineProperty, simple-statistics cannot be mixed in');
    }

    // only methods which work on basic arrays in a single step
    // are supported
    var arrayMethods = ['median', 'standardDeviation', 'sum', 'product',
        'sampleSkewness',
        'mean', 'min', 'max', 'quantile', 'geometricMean',
        'harmonicMean', 'root_mean_square'];

    // create a closure with a method name so that a reference
    // like `arrayMethods[i]` doesn't follow the loop increment
    function wrap(method) {
        return function() {
            // cast any arguments into an array, since they're
            // natively objects
            var args = Array.prototype.slice.apply(arguments);
            // make the first argument the array itself
            args.unshift(this);
            // return the result of the ss method
            return ss[method].apply(ss, args);
        };
    }

    // select object to extend
    var extending;
    if (array) {
        // create a shallow copy of the array so that our internal
        // operations do not change it by reference
        extending = array.slice();
    } else {
        extending = Array.prototype;
    }

    // for each array function, define a function that gets
    // the array as the first argument.
    // We use [defineProperty](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/defineProperty)
    // because it allows these properties to be non-enumerable:
    // `for (var in x)` loops will not run into problems with this
    // implementation.
    for (var i = 0; i < arrayMethods.length; i++) {
        Object.defineProperty(extending, arrayMethods[i], {
            value: wrap(arrayMethods[i]),
            configurable: true,
            enumerable: false,
            writable: true
        });
    }

    return extending;
}

module.exports = mixin;

},{}],42:[function(require,module,exports){
'use strict';
/* @flow */

var numericSort = require('./numeric_sort'),
    modeSorted = require('./mode_sorted');

/**
 * The [mode](http://bit.ly/W5K4Yt) is the number that appears in a list the highest number of times.
 * There can be multiple modes in a list: in the event of a tie, this
 * algorithm will return the most recently seen mode.
 *
 * This is a [measure of central tendency](https://en.wikipedia.org/wiki/Central_tendency):
 * a method of finding a typical or central value of a set of numbers.
 *
 * This runs on `O(nlog(n))` because it needs to sort the array internally
 * before running an `O(n)` search to find the mode.
 *
 * @param {Array<number>} x input
 * @returns {number} mode
 * @example
 * mode([0, 0, 1]); // => 0
 */
function mode(x /*: Array<number> */)/*:number*/ {
    // Sorting the array lets us iterate through it below and be sure
    // that every time we see a new number it's new and we'll never
    // see the same number twice
    return modeSorted(numericSort(x));
}

module.exports = mode;

},{"./mode_sorted":43,"./numeric_sort":44}],43:[function(require,module,exports){
'use strict';
/* @flow */

/**
 * The [mode](http://bit.ly/W5K4Yt) is the number that appears in a list the highest number of times.
 * There can be multiple modes in a list: in the event of a tie, this
 * algorithm will return the most recently seen mode.
 *
 * This is a [measure of central tendency](https://en.wikipedia.org/wiki/Central_tendency):
 * a method of finding a typical or central value of a set of numbers.
 *
 * This runs in `O(n)` because the input is sorted.
 *
 * @param {Array<number>} sorted input
 * @returns {number} mode
 * @example
 * modeSorted([0, 0, 1]); // => 0
 */
function modeSorted(sorted /*: Array<number> */)/*:number*/ {

    // Handle edge cases:
    // The mode of an empty list is NaN
    if (sorted.length === 0) { return NaN; }
    else if (sorted.length === 1) { return sorted[0]; }

    // This assumes it is dealing with an array of size > 1, since size
    // 0 and 1 are handled immediately. Hence it starts at index 1 in the
    // array.
    var last = sorted[0],
        // store the mode as we find new modes
        value = NaN,
        // store how many times we've seen the mode
        maxSeen = 0,
        // how many times the current candidate for the mode
        // has been seen
        seenThis = 1;

    // end at sorted.length + 1 to fix the case in which the mode is
    // the highest number that occurs in the sequence. the last iteration
    // compares sorted[i], which is undefined, to the highest number
    // in the series
    for (var i = 1; i < sorted.length + 1; i++) {
        // we're seeing a new number pass by
        if (sorted[i] !== last) {
            // the last number is the new mode since we saw it more
            // often than the old one
            if (seenThis > maxSeen) {
                maxSeen = seenThis;
                value = last;
            }
            seenThis = 1;
            last = sorted[i];
        // if this isn't a new number, it's one more occurrence of
        // the potential mode
        } else { seenThis++; }
    }
    return value;
}

module.exports = modeSorted;

},{}],44:[function(require,module,exports){
'use strict';
/* @flow */

/**
 * Sort an array of numbers by their numeric value, ensuring that the
 * array is not changed in place.
 *
 * This is necessary because the default behavior of .sort
 * in JavaScript is to sort arrays as string values
 *
 *     [1, 10, 12, 102, 20].sort()
 *     // output
 *     [1, 10, 102, 12, 20]
 *
 * @param {Array<number>} array input array
 * @return {Array<number>} sorted array
 * @private
 * @example
 * numericSort([3, 2, 1]) // => [1, 2, 3]
 */
function numericSort(array /*: Array<number> */) /*: Array<number> */ {
    return array
        // ensure the array is changed in-place
        .slice()
        // comparator function that treats input as numeric
        .sort(function(a, b) {
            return a - b;
        });
}

module.exports = numericSort;

},{}],45:[function(require,module,exports){
'use strict';
/* @flow */

/**
 * This is a single-layer [Perceptron Classifier](http://en.wikipedia.org/wiki/Perceptron) that takes
 * arrays of numbers and predicts whether they should be classified
 * as either 0 or 1 (negative or positive examples).
 * @class
 * @example
 * // Create the model
 * var p = new PerceptronModel();
 * // Train the model with input with a diagonal boundary.
 * for (var i = 0; i < 5; i++) {
 *     p.train([1, 1], 1);
 *     p.train([0, 1], 0);
 *     p.train([1, 0], 0);
 *     p.train([0, 0], 0);
 * }
 * p.predict([0, 0]); // 0
 * p.predict([0, 1]); // 0
 * p.predict([1, 0]); // 0
 * p.predict([1, 1]); // 1
 */
function PerceptronModel() {
    // The weights, or coefficients of the model;
    // weights are only populated when training with data.
    this.weights = [];
    // The bias term, or intercept; it is also a weight but
    // it's stored separately for convenience as it is always
    // multiplied by one.
    this.bias = 0;
}

/**
 * **Predict**: Use an array of features with the weight array and bias
 * to predict whether an example is labeled 0 or 1.
 *
 * @param {Array<number>} features an array of features as numbers
 * @returns {number} 1 if the score is over 0, otherwise 0
 */
PerceptronModel.prototype.predict = function(features) {

    // Only predict if previously trained
    // on the same size feature array(s).
    if (features.length !== this.weights.length) { return null; }

    // Calculate the sum of features times weights,
    // with the bias added (implicitly times one).
    var score = 0;
    for (var i = 0; i < this.weights.length; i++) {
        score += this.weights[i] * features[i];
    }
    score += this.bias;

    // Classify as 1 if the score is over 0, otherwise 0.
    if (score > 0) {
        return 1;
    } else {
        return 0;
    }
};

/**
 * **Train** the classifier with a new example, which is
 * a numeric array of features and a 0 or 1 label.
 *
 * @param {Array<number>} features an array of features as numbers
 * @param {number} label either 0 or 1
 * @returns {PerceptronModel} this
 */
PerceptronModel.prototype.train = function(features, label) {
    // Require that only labels of 0 or 1 are considered.
    if (label !== 0 && label !== 1) { return null; }
    // The length of the feature array determines
    // the length of the weight array.
    // The perceptron will continue learning as long as
    // it keeps seeing feature arrays of the same length.
    // When it sees a new data shape, it initializes.
    if (features.length !== this.weights.length) {
        this.weights = features;
        this.bias = 1;
    }
    // Make a prediction based on current weights.
    var prediction = this.predict(features);
    // Update the weights if the prediction is wrong.
    if (prediction !== label) {
        var gradient = label - prediction;
        for (var i = 0; i < this.weights.length; i++) {
            this.weights[i] += gradient * features[i];
        }
        this.bias += gradient;
    }
    return this;
};

module.exports = PerceptronModel;

},{}],46:[function(require,module,exports){
'use strict';
/* @flow */

var epsilon = require('./epsilon');
var factorial = require('./factorial');

/**
 * The [Poisson Distribution](http://en.wikipedia.org/wiki/Poisson_distribution)
 * is a discrete probability distribution that expresses the probability
 * of a given number of events occurring in a fixed interval of time
 * and/or space if these events occur with a known average rate and
 * independently of the time since the last event.
 *
 * The Poisson Distribution is characterized by the strictly positive
 * mean arrival or occurrence rate, `λ`.
 *
 * @param {number} lambda location poisson distribution
 * @returns {number} value of poisson distribution at that point
 */
function poissonDistribution(lambda/*: number */) {
    // Check that lambda is strictly positive
    if (lambda <= 0) { return undefined; }

    // our current place in the distribution
    var x = 0,
        // and we keep track of the current cumulative probability, in
        // order to know when to stop calculating chances.
        cumulativeProbability = 0,
        // the calculated cells to be returned
        cells = {};

    // This algorithm iterates through each potential outcome,
    // until the `cumulativeProbability` is very close to 1, at
    // which point we've defined the vast majority of outcomes
    do {
        // a [probability mass function](https://en.wikipedia.org/wiki/Probability_mass_function)
        cells[x] = (Math.pow(Math.E, -lambda) * Math.pow(lambda, x)) / factorial(x);
        cumulativeProbability += cells[x];
        x++;
    // when the cumulativeProbability is nearly 1, we've calculated
    // the useful range of this distribution
    } while (cumulativeProbability < 1 - epsilon);

    return cells;
}

module.exports = poissonDistribution;

},{"./epsilon":23,"./factorial":26}],47:[function(require,module,exports){
'use strict';
/* @flow */

var epsilon = require('./epsilon');
var inverseErrorFunction = require('./inverse_error_function');

/**
 * The [Probit](http://en.wikipedia.org/wiki/Probit)
 * is the inverse of cumulativeStdNormalProbability(),
 * and is also known as the normal quantile function.
 *
 * It returns the number of standard deviations from the mean
 * where the p'th quantile of values can be found in a normal distribution.
 * So, for example, probit(0.5 + 0.6827/2) ≈ 1 because 68.27% of values are
 * normally found within 1 standard deviation above or below the mean.
 *
 * @param {number} p
 * @returns {number} probit
 */
function probit(p /*: number */)/*: number */ {
    if (p === 0) {
        p = epsilon;
    } else if (p >= 1) {
        p = 1 - epsilon;
    }
    return Math.sqrt(2) * inverseErrorFunction(2 * p - 1);
}

module.exports = probit;

},{"./epsilon":23,"./inverse_error_function":30}],48:[function(require,module,exports){
'use strict';
/* @flow */

/**
 * The [product](https://en.wikipedia.org/wiki/Product_(mathematics)) of an array
 * is the result of multiplying all numbers together, starting using one as the multiplicative identity.
 *
 * This runs on `O(n)`, linear time in respect to the array
 *
 * @param {Array<number>} x input
 * @return {number} product of all input numbers
 * @example
 * product([1, 2, 3, 4]); // => 24
 */
function product(x/*: Array<number> */)/*: number */ {
    var value = 1;
    for (var i = 0; i < x.length; i++) {
        value *= x[i];
    }
    return value;
}

module.exports = product;

},{}],49:[function(require,module,exports){
'use strict';
/* @flow */

var quantileSorted = require('./quantile_sorted');
var quickselect = require('./quickselect');

/**
 * The [quantile](https://en.wikipedia.org/wiki/Quantile):
 * this is a population quantile, since we assume to know the entire
 * dataset in this library. This is an implementation of the
 * [Quantiles of a Population](http://en.wikipedia.org/wiki/Quantile#Quantiles_of_a_population)
 * algorithm from wikipedia.
 *
 * Sample is a one-dimensional array of numbers,
 * and p is either a decimal number from 0 to 1 or an array of decimal
 * numbers from 0 to 1.
 * In terms of a k/q quantile, p = k/q - it's just dealing with fractions or dealing
 * with decimal values.
 * When p is an array, the result of the function is also an array containing the appropriate
 * quantiles in input order
 *
 * @param {Array<number>} sample a sample from the population
 * @param {number} p the desired quantile, as a number between 0 and 1
 * @returns {number} quantile
 * @example
 * quantile([3, 6, 7, 8, 8, 9, 10, 13, 15, 16, 20], 0.5); // => 9
 */
function quantile(sample /*: Array<number> */, p /*: Array<number> | number */) {
    var copy = sample.slice();

    if (Array.isArray(p)) {
        // rearrange elements so that each element corresponding to a requested
        // quantile is on a place it would be if the array was fully sorted
        multiQuantileSelect(copy, p);
        // Initialize the result array
        var results = [];
        // For each requested quantile
        for (var i = 0; i < p.length; i++) {
            results[i] = quantileSorted(copy, p[i]);
        }
        return results;
    } else {
        var idx = quantileIndex(copy.length, p);
        quantileSelect(copy, idx, 0, copy.length - 1);
        return quantileSorted(copy, p);
    }
}

function quantileSelect(arr, k, left, right) {
    if (k % 1 === 0) {
        quickselect(arr, k, left, right);
    } else {
        k = Math.floor(k);
        quickselect(arr, k, left, right);
        quickselect(arr, k + 1, k + 1, right);
    }
}

function multiQuantileSelect(arr, p) {
    var indices = [0];
    for (var i = 0; i < p.length; i++) {
        indices.push(quantileIndex(arr.length, p[i]));
    }
    indices.push(arr.length - 1);
    indices.sort(compare);

    var stack = [0, indices.length - 1];

    while (stack.length) {
        var r = Math.ceil(stack.pop());
        var l = Math.floor(stack.pop());
        if (r - l <= 1) continue;

        var m = Math.floor((l + r) / 2);
        quantileSelect(arr, indices[m], indices[l], indices[r]);

        stack.push(l, m, m, r);
    }
}

function compare(a, b) {
    return a - b;
}

function quantileIndex(len /*: number */, p /*: number */)/*:number*/ {
    var idx = len * p;
    if (p === 1) {
        // If p is 1, directly return the last index
        return len - 1;
    } else if (p === 0) {
        // If p is 0, directly return the first index
        return 0;
    } else if (idx % 1 !== 0) {
        // If index is not integer, return the next index in array
        return Math.ceil(idx) - 1;
    } else if (len % 2 === 0) {
        // If the list has even-length, we'll return the middle of two indices
        // around quantile to indicate that we need an average value of the two
        return idx - 0.5;
    } else {
        // Finally, in the simple case of an integer index
        // with an odd-length list, return the index
        return idx;
    }
}

module.exports = quantile;

},{"./quantile_sorted":50,"./quickselect":51}],50:[function(require,module,exports){
'use strict';
/* @flow */

/**
 * This is the internal implementation of quantiles: when you know
 * that the order is sorted, you don't need to re-sort it, and the computations
 * are faster.
 *
 * @param {Array<number>} sample input data
 * @param {number} p desired quantile: a number between 0 to 1, inclusive
 * @returns {number} quantile value
 * @example
 * quantileSorted([3, 6, 7, 8, 8, 9, 10, 13, 15, 16, 20], 0.5); // => 9
 */
function quantileSorted(sample /*: Array<number> */, p /*: number */)/*:number*/ {
    var idx = sample.length * p;
    if (p < 0 || p > 1) {
        return NaN;
    } else if (p === 1) {
        // If p is 1, directly return the last element
        return sample[sample.length - 1];
    } else if (p === 0) {
        // If p is 0, directly return the first element
        return sample[0];
    } else if (idx % 1 !== 0) {
        // If p is not integer, return the next element in array
        return sample[Math.ceil(idx) - 1];
    } else if (sample.length % 2 === 0) {
        // If the list has even-length, we'll take the average of this number
        // and the next value, if there is one
        return (sample[idx - 1] + sample[idx]) / 2;
    } else {
        // Finally, in the simple case of an integer value
        // with an odd-length list, return the sample value at the index.
        return sample[idx];
    }
}

module.exports = quantileSorted;

},{}],51:[function(require,module,exports){
'use strict';
/* @flow */

module.exports = quickselect;

/**
 * Rearrange items in `arr` so that all items in `[left, k]` range are the smallest.
 * The `k`-th element will have the `(k - left + 1)`-th smallest value in `[left, right]`.
 *
 * Implements Floyd-Rivest selection algorithm https://en.wikipedia.org/wiki/Floyd-Rivest_algorithm
 *
 * @private
 * @param {Array<number>} arr input array
 * @param {number} k pivot index
 * @param {number} left left index
 * @param {number} right right index
 * @returns {undefined}
 * @example
 * var arr = [65, 28, 59, 33, 21, 56, 22, 95, 50, 12, 90, 53, 28, 77, 39];
 * quickselect(arr, 8);
 * // = [39, 28, 28, 33, 21, 12, 22, 50, 53, 56, 59, 65, 90, 77, 95]
 */
function quickselect(arr /*: Array<number> */, k /*: number */, left /*: number */, right /*: number */) {
    left = left || 0;
    right = right || (arr.length - 1);

    while (right > left) {
        // 600 and 0.5 are arbitrary constants chosen in the original paper to minimize execution time
        if (right - left > 600) {
            var n = right - left + 1;
            var m = k - left + 1;
            var z = Math.log(n);
            var s = 0.5 * Math.exp(2 * z / 3);
            var sd = 0.5 * Math.sqrt(z * s * (n - s) / n);
            if (m - n / 2 < 0) sd *= -1;
            var newLeft = Math.max(left, Math.floor(k - m * s / n + sd));
            var newRight = Math.min(right, Math.floor(k + (n - m) * s / n + sd));
            quickselect(arr, k, newLeft, newRight);
        }

        var t = arr[k];
        var i = left;
        var j = right;

        swap(arr, left, k);
        if (arr[right] > t) swap(arr, left, right);

        while (i < j) {
            swap(arr, i, j);
            i++;
            j--;
            while (arr[i] < t) i++;
            while (arr[j] > t) j--;
        }

        if (arr[left] === t) swap(arr, left, j);
        else {
            j++;
            swap(arr, j, right);
        }

        if (j <= k) left = j + 1;
        if (k <= j) right = j - 1;
    }
}

function swap(arr, i, j) {
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
}

},{}],52:[function(require,module,exports){
'use strict';
/* @flow */

/**
 * The [R Squared](http://en.wikipedia.org/wiki/Coefficient_of_determination)
 * value of data compared with a function `f`
 * is the sum of the squared differences between the prediction
 * and the actual value.
 *
 * @param {Array<Array<number>>} data input data: this should be doubly-nested
 * @param {Function} func function called on `[i][0]` values within the dataset
 * @returns {number} r-squared value
 * @example
 * var samples = [[0, 0], [1, 1]];
 * var regressionLine = linearRegressionLine(linearRegression(samples));
 * rSquared(samples, regressionLine); // = 1 this line is a perfect fit
 */
function rSquared(data /*: Array<Array<number>> */, func /*: Function */) /*: number */ {
    if (data.length < 2) { return 1; }

    // Compute the average y value for the actual
    // data set in order to compute the
    // _total sum of squares_
    var sum = 0, average;
    for (var i = 0; i < data.length; i++) {
        sum += data[i][1];
    }
    average = sum / data.length;

    // Compute the total sum of squares - the
    // squared difference between each point
    // and the average of all points.
    var sumOfSquares = 0;
    for (var j = 0; j < data.length; j++) {
        sumOfSquares += Math.pow(average - data[j][1], 2);
    }

    // Finally estimate the error: the squared
    // difference between the estimate and the actual data
    // value at each point.
    var err = 0;
    for (var k = 0; k < data.length; k++) {
        err += Math.pow(data[k][1] - func(data[k][0]), 2);
    }

    // As the error grows larger, its ratio to the
    // sum of squares increases and the r squared
    // value grows lower.
    return 1 - err / sumOfSquares;
}

module.exports = rSquared;

},{}],53:[function(require,module,exports){
'use strict';
/* @flow */

/**
 * The Root Mean Square (RMS) is
 * a mean function used as a measure of the magnitude of a set
 * of numbers, regardless of their sign.
 * This is the square root of the mean of the squares of the
 * input numbers.
 * This runs on `O(n)`, linear time in respect to the array
 *
 * @param {Array<number>} x input
 * @returns {number} root mean square
 * @example
 * rootMeanSquare([-1, 1, -1, 1]); // => 1
 */
function rootMeanSquare(x /*: Array<number> */)/*:number*/ {
    if (x.length === 0) { return NaN; }

    var sumOfSquares = 0;
    for (var i = 0; i < x.length; i++) {
        sumOfSquares += Math.pow(x[i], 2);
    }

    return Math.sqrt(sumOfSquares / x.length);
}

module.exports = rootMeanSquare;

},{}],54:[function(require,module,exports){
'use strict';
/* @flow */

var shuffle = require('./shuffle');

/**
 * Create a [simple random sample](http://en.wikipedia.org/wiki/Simple_random_sample)
 * from a given array of `n` elements.
 *
 * The sampled values will be in any order, not necessarily the order
 * they appear in the input.
 *
 * @param {Array} array input array. can contain any type
 * @param {number} n count of how many elements to take
 * @param {Function} [randomSource=Math.random] an optional source of entropy
 * instead of Math.random
 * @return {Array} subset of n elements in original array
 * @example
 * var values = [1, 2, 4, 5, 6, 7, 8, 9];
 * sample(values, 3); // returns 3 random values, like [2, 5, 8];
 */
function sample/*:: <T> */(
    array /*: Array<T> */,
    n /*: number */,
    randomSource /*: Function */) /*: Array<T> */ {
    // shuffle the original array using a fisher-yates shuffle
    var shuffled = shuffle(array, randomSource);

    // and then return a subset of it - the first `n` elements.
    return shuffled.slice(0, n);
}

module.exports = sample;

},{"./shuffle":60}],55:[function(require,module,exports){
'use strict';
/* @flow */

var sampleCovariance = require('./sample_covariance');
var sampleStandardDeviation = require('./sample_standard_deviation');

/**
 * The [correlation](http://en.wikipedia.org/wiki/Correlation_and_dependence) is
 * a measure of how correlated two datasets are, between -1 and 1
 *
 * @param {Array<number>} x first input
 * @param {Array<number>} y second input
 * @returns {number} sample correlation
 * @example
 * sampleCorrelation([1, 2, 3, 4, 5, 6], [2, 2, 3, 4, 5, 60]).toFixed(2);
 * // => '0.69'
 */
function sampleCorrelation(x/*: Array<number> */, y/*: Array<number> */)/*:number*/ {
    var cov = sampleCovariance(x, y),
        xstd = sampleStandardDeviation(x),
        ystd = sampleStandardDeviation(y);

    return cov / xstd / ystd;
}

module.exports = sampleCorrelation;

},{"./sample_covariance":56,"./sample_standard_deviation":58}],56:[function(require,module,exports){
'use strict';
/* @flow */

var mean = require('./mean');

/**
 * [Sample covariance](https://en.wikipedia.org/wiki/Sample_mean_and_sampleCovariance) of two datasets:
 * how much do the two datasets move together?
 * x and y are two datasets, represented as arrays of numbers.
 *
 * @param {Array<number>} x first input
 * @param {Array<number>} y second input
 * @returns {number} sample covariance
 * @example
 * sampleCovariance([1, 2, 3, 4, 5, 6], [6, 5, 4, 3, 2, 1]); // => -3.5
 */
function sampleCovariance(x /*:Array<number>*/, y /*:Array<number>*/)/*:number*/ {

    // The two datasets must have the same length which must be more than 1
    if (x.length <= 1 || x.length !== y.length) {
        return NaN;
    }

    // determine the mean of each dataset so that we can judge each
    // value of the dataset fairly as the difference from the mean. this
    // way, if one dataset is [1, 2, 3] and [2, 3, 4], their covariance
    // does not suffer because of the difference in absolute values
    var xmean = mean(x),
        ymean = mean(y),
        sum = 0;

    // for each pair of values, the covariance increases when their
    // difference from the mean is associated - if both are well above
    // or if both are well below
    // the mean, the covariance increases significantly.
    for (var i = 0; i < x.length; i++) {
        sum += (x[i] - xmean) * (y[i] - ymean);
    }

    // this is Bessels' Correction: an adjustment made to sample statistics
    // that allows for the reduced degree of freedom entailed in calculating
    // values from samples rather than complete populations.
    var besselsCorrection = x.length - 1;

    // the covariance is weighted by the length of the datasets.
    return sum / besselsCorrection;
}

module.exports = sampleCovariance;

},{"./mean":35}],57:[function(require,module,exports){
'use strict';
/* @flow */

var sumNthPowerDeviations = require('./sum_nth_power_deviations');
var sampleStandardDeviation = require('./sample_standard_deviation');

/**
 * [Skewness](http://en.wikipedia.org/wiki/Skewness) is
 * a measure of the extent to which a probability distribution of a
 * real-valued random variable "leans" to one side of the mean.
 * The skewness value can be positive or negative, or even undefined.
 *
 * Implementation is based on the adjusted Fisher-Pearson standardized
 * moment coefficient, which is the version found in Excel and several
 * statistical packages including Minitab, SAS and SPSS.
 *
 * @param {Array<number>} x input
 * @returns {number} sample skewness
 * @example
 * sampleSkewness([2, 4, 6, 3, 1]); // => 0.590128656384365
 */
function sampleSkewness(x /*: Array<number> */)/*:number*/ {
    // The skewness of less than three arguments is null
    var theSampleStandardDeviation = sampleStandardDeviation(x);

    if (isNaN(theSampleStandardDeviation) || x.length < 3) {
        return NaN;
    }

    var n = x.length,
        cubedS = Math.pow(theSampleStandardDeviation, 3),
        sumCubedDeviations = sumNthPowerDeviations(x, 3);

    return n * sumCubedDeviations / ((n - 1) * (n - 2) * cubedS);
}

module.exports = sampleSkewness;

},{"./sample_standard_deviation":58,"./sum_nth_power_deviations":66}],58:[function(require,module,exports){
'use strict';
/* @flow */

var sampleVariance = require('./sample_variance');

/**
 * The [standard deviation](http://en.wikipedia.org/wiki/Standard_deviation)
 * is the square root of the variance.
 *
 * @param {Array<number>} x input array
 * @returns {number} sample standard deviation
 * @example
 * sampleStandardDeviation([2, 4, 4, 4, 5, 5, 7, 9]).toFixed(2);
 * // => '2.14'
 */
function sampleStandardDeviation(x/*:Array<number>*/)/*:number*/ {
    // The standard deviation of no numbers is null
    var sampleVarianceX = sampleVariance(x);
    if (isNaN(sampleVarianceX)) { return NaN; }
    return Math.sqrt(sampleVarianceX);
}

module.exports = sampleStandardDeviation;

},{"./sample_variance":59}],59:[function(require,module,exports){
'use strict';
/* @flow */

var sumNthPowerDeviations = require('./sum_nth_power_deviations');

/*
 * The [sample variance](https://en.wikipedia.org/wiki/Variance#Sample_variance)
 * is the sum of squared deviations from the mean. The sample variance
 * is distinguished from the variance by the usage of [Bessel's Correction](https://en.wikipedia.org/wiki/Bessel's_correction):
 * instead of dividing the sum of squared deviations by the length of the input,
 * it is divided by the length minus one. This corrects the bias in estimating
 * a value from a set that you don't know if full.
 *
 * References:
 * * [Wolfram MathWorld on Sample Variance](http://mathworld.wolfram.com/SampleVariance.html)
 *
 * @param {Array<number>} x input array
 * @return {number} sample variance
 * @example
 * sampleVariance([1, 2, 3, 4, 5]); // => 2.5
 */
function sampleVariance(x /*: Array<number> */)/*:number*/ {
    // The variance of no numbers is null
    if (x.length <= 1) { return NaN; }

    var sumSquaredDeviationsValue = sumNthPowerDeviations(x, 2);

    // this is Bessels' Correction: an adjustment made to sample statistics
    // that allows for the reduced degree of freedom entailed in calculating
    // values from samples rather than complete populations.
    var besselsCorrection = x.length - 1;

    // Find the mean value of that list
    return sumSquaredDeviationsValue / besselsCorrection;
}

module.exports = sampleVariance;

},{"./sum_nth_power_deviations":66}],60:[function(require,module,exports){
'use strict';
/* @flow */

var shuffleInPlace = require('./shuffle_in_place');

/*
 * A [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle)
 * is a fast way to create a random permutation of a finite set. This is
 * a function around `shuffle_in_place` that adds the guarantee that
 * it will not modify its input.
 *
 * @param {Array} sample an array of any kind of element
 * @param {Function} [randomSource=Math.random] an optional entropy source
 * @return {Array} shuffled version of input
 * @example
 * var shuffled = shuffle([1, 2, 3, 4]);
 * shuffled; // = [2, 3, 1, 4] or any other random permutation
 */
function shuffle/*::<T>*/(sample/*:Array<T>*/, randomSource/*:Function*/) {
    // slice the original array so that it is not modified
    sample = sample.slice();

    // and then shuffle that shallow-copied array, in place
    return shuffleInPlace(sample.slice(), randomSource);
}

module.exports = shuffle;

},{"./shuffle_in_place":61}],61:[function(require,module,exports){
'use strict';
/* @flow */

/*
 * A [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle)
 * in-place - which means that it **will change the order of the original
 * array by reference**.
 *
 * This is an algorithm that generates a random [permutation](https://en.wikipedia.org/wiki/Permutation)
 * of a set.
 *
 * @param {Array} sample input array
 * @param {Function} [randomSource=Math.random] an optional source of entropy
 * @returns {Array} sample
 * @example
 * var sample = [1, 2, 3, 4];
 * shuffleInPlace(sample);
 * // sample is shuffled to a value like [2, 1, 4, 3]
 */
function shuffleInPlace(sample/*:Array<any>*/, randomSource/*:Function*/)/*:Array<any>*/ {


    // a custom random number source can be provided if you want to use
    // a fixed seed or another random number generator, like
    // [random-js](https://www.npmjs.org/package/random-js)
    randomSource = randomSource || Math.random;

    // store the current length of the sample to determine
    // when no elements remain to shuffle.
    var length = sample.length;

    // temporary is used to hold an item when it is being
    // swapped between indices.
    var temporary;

    // The index to swap at each stage.
    var index;

    // While there are still items to shuffle
    while (length > 0) {
        // chose a random index within the subset of the array
        // that is not yet shuffled
        index = Math.floor(randomSource() * length--);

        // store the value that we'll move temporarily
        temporary = sample[length];

        // swap the value at `sample[length]` with `sample[index]`
        sample[length] = sample[index];
        sample[index] = temporary;
    }

    return sample;
}

module.exports = shuffleInPlace;

},{}],62:[function(require,module,exports){
'use strict';
/* @flow */

/**
 * [Sign](https://en.wikipedia.org/wiki/Sign_function) is a function 
 * that extracts the sign of a real number
 * 
 * @param {Number} x input value
 * @returns {Number} sign value either 1, 0 or -1
 * @throws {TypeError} if the input argument x is not a number
 * 
 * @example
 * sign(2); // => 1
 */
function sign(x/*: number */)/*: number */ {
    if (typeof x === 'number') {
        if (x < 0) {
            return -1;
        } else if (x === 0) {
            return 0
        } else {
            return 1;
        }
    } else {
        throw new TypeError('not a number');
    }
}

module.exports = sign;

},{}],63:[function(require,module,exports){
'use strict';
/* @flow */

var variance = require('./variance');

/**
 * The [standard deviation](http://en.wikipedia.org/wiki/Standard_deviation)
 * is the square root of the variance. It's useful for measuring the amount
 * of variation or dispersion in a set of values.
 *
 * Standard deviation is only appropriate for full-population knowledge: for
 * samples of a population, {@link sampleStandardDeviation} is
 * more appropriate.
 *
 * @param {Array<number>} x input
 * @returns {number} standard deviation
 * @example
 * variance([2, 4, 4, 4, 5, 5, 7, 9]); // => 4
 * standardDeviation([2, 4, 4, 4, 5, 5, 7, 9]); // => 2
 */
function standardDeviation(x /*: Array<number> */)/*:number*/ {
    // The standard deviation of no numbers is null
    var v = variance(x);
    if (isNaN(v)) { return 0; }
    return Math.sqrt(v);
}

module.exports = standardDeviation;

},{"./variance":71}],64:[function(require,module,exports){
'use strict';
/* @flow */

var SQRT_2PI = Math.sqrt(2 * Math.PI);

function cumulativeDistribution(z) {
    var sum = z,
        tmp = z;

    // 15 iterations are enough for 4-digit precision
    for (var i = 1; i < 15; i++) {
        tmp *= z * z / (2 * i + 1);
        sum += tmp;
    }
    return Math.round((0.5 + (sum / SQRT_2PI) * Math.exp(-z * z / 2)) * 1e4) / 1e4;
}

/**
 * A standard normal table, also called the unit normal table or Z table,
 * is a mathematical table for the values of Φ (phi), which are the values of
 * the cumulative distribution function of the normal distribution.
 * It is used to find the probability that a statistic is observed below,
 * above, or between values on the standard normal distribution, and by
 * extension, any normal distribution.
 *
 * The probabilities are calculated using the
 * [Cumulative distribution function](https://en.wikipedia.org/wiki/Normal_distribution#Cumulative_distribution_function).
 * The table used is the cumulative, and not cumulative from 0 to mean
 * (even though the latter has 5 digits precision, instead of 4).
 */
var standardNormalTable/*: Array<number> */ = [];

for (var z = 0; z <= 3.09; z += 0.01) {
    standardNormalTable.push(cumulativeDistribution(z));
}

module.exports = standardNormalTable;

},{}],65:[function(require,module,exports){
'use strict';
/* @flow */

/**
 * Our default sum is the [Kahan summation algorithm](https://en.wikipedia.org/wiki/Kahan_summation_algorithm) is
 * a method for computing the sum of a list of numbers while correcting
 * for floating-point errors. Traditionally, sums are calculated as many
 * successive additions, each one with its own floating-point roundoff. These
 * losses in precision add up as the number of numbers increases. This alternative
 * algorithm is more accurate than the simple way of calculating sums by simple
 * addition.
 *
 * This runs on `O(n)`, linear time in respect to the array
 *
 * @param {Array<number>} x input
 * @return {number} sum of all input numbers
 * @example
 * sum([1, 2, 3]); // => 6
 */
function sum(x/*: Array<number> */)/*: number */ {

    // like the traditional sum algorithm, we keep a running
    // count of the current sum.
    var sum = 0;

    // but we also keep three extra variables as bookkeeping:
    // most importantly, an error correction value. This will be a very
    // small number that is the opposite of the floating point precision loss.
    var errorCompensation = 0;

    // this will be each number in the list corrected with the compensation value.
    var correctedCurrentValue;

    // and this will be the next sum
    var nextSum;

    for (var i = 0; i < x.length; i++) {
        // first correct the value that we're going to add to the sum
        correctedCurrentValue = x[i] - errorCompensation;

        // compute the next sum. sum is likely a much larger number
        // than correctedCurrentValue, so we'll lose precision here,
        // and measure how much precision is lost in the next step
        nextSum = sum + correctedCurrentValue;

        // we intentionally didn't assign sum immediately, but stored
        // it for now so we can figure out this: is (sum + nextValue) - nextValue
        // not equal to 0? ideally it would be, but in practice it won't:
        // it will be some very small number. that's what we record
        // as errorCompensation.
        errorCompensation = nextSum - sum - correctedCurrentValue;

        // now that we've computed how much we'll correct for in the next
        // loop, start treating the nextSum as the current sum.
        sum = nextSum;
    }

    return sum;
}

module.exports = sum;

},{}],66:[function(require,module,exports){
'use strict';
/* @flow */

var mean = require('./mean');

/**
 * The sum of deviations to the Nth power.
 * When n=2 it's the sum of squared deviations.
 * When n=3 it's the sum of cubed deviations.
 *
 * @param {Array<number>} x
 * @param {number} n power
 * @returns {number} sum of nth power deviations
 * @example
 * var input = [1, 2, 3];
 * // since the variance of a set is the mean squared
 * // deviations, we can calculate that with sumNthPowerDeviations:
 * var variance = sumNthPowerDeviations(input) / input.length;
 */
function sumNthPowerDeviations(x/*: Array<number> */, n/*: number */)/*:number*/ {
    var meanValue = mean(x),
        sum = 0;

    for (var i = 0; i < x.length; i++) {
        sum += Math.pow(x[i] - meanValue, n);
    }

    return sum;
}

module.exports = sumNthPowerDeviations;

},{"./mean":35}],67:[function(require,module,exports){
'use strict';
/* @flow */

/**
 * The simple [sum](https://en.wikipedia.org/wiki/Summation) of an array
 * is the result of adding all numbers together, starting from zero.
 *
 * This runs on `O(n)`, linear time in respect to the array
 *
 * @param {Array<number>} x input
 * @return {number} sum of all input numbers
 * @example
 * sumSimple([1, 2, 3]); // => 6
 */
function sumSimple(x/*: Array<number> */)/*: number */ {
    var value = 0;
    for (var i = 0; i < x.length; i++) {
        value += x[i];
    }
    return value;
}

module.exports = sumSimple;

},{}],68:[function(require,module,exports){
'use strict';
/* @flow */

var standardDeviation = require('./standard_deviation');
var mean = require('./mean');

/**
 * This is to compute [a one-sample t-test](https://en.wikipedia.org/wiki/Student%27s_t-test#One-sample_t-test), comparing the mean
 * of a sample to a known value, x.
 *
 * in this case, we're trying to determine whether the
 * population mean is equal to the value that we know, which is `x`
 * here. usually the results here are used to look up a
 * [p-value](http://en.wikipedia.org/wiki/P-value), which, for
 * a certain level of significance, will let you determine that the
 * null hypothesis can or cannot be rejected.
 *
 * @param {Array<number>} sample an array of numbers as input
 * @param {number} x expected vale of the population mean
 * @returns {number} value
 * @example
 * tTest([1, 2, 3, 4, 5, 6], 3.385).toFixed(2); // => '0.16'
 */
function tTest(sample/*: Array<number> */, x/*: number */)/*:number*/ {
    // The mean of the sample
    var sampleMean = mean(sample);

    // The standard deviation of the sample
    var sd = standardDeviation(sample);

    // Square root the length of the sample
    var rootN = Math.sqrt(sample.length);

    // returning the t value
    return (sampleMean - x) / (sd / rootN);
}

module.exports = tTest;

},{"./mean":35,"./standard_deviation":63}],69:[function(require,module,exports){
'use strict';
/* @flow */

var mean = require('./mean');
var sampleVariance = require('./sample_variance');

/**
 * This is to compute [two sample t-test](http://en.wikipedia.org/wiki/Student's_t-test).
 * Tests whether "mean(X)-mean(Y) = difference", (
 * in the most common case, we often have `difference == 0` to test if two samples
 * are likely to be taken from populations with the same mean value) with
 * no prior knowledge on standard deviations of both samples
 * other than the fact that they have the same standard deviation.
 *
 * Usually the results here are used to look up a
 * [p-value](http://en.wikipedia.org/wiki/P-value), which, for
 * a certain level of significance, will let you determine that the
 * null hypothesis can or cannot be rejected.
 *
 * `diff` can be omitted if it equals 0.
 *
 * [This is used to confirm or deny](http://www.monarchlab.org/Lab/Research/Stats/2SampleT.aspx)
 * a null hypothesis that the two populations that have been sampled into
 * `sampleX` and `sampleY` are equal to each other.
 *
 * @param {Array<number>} sampleX a sample as an array of numbers
 * @param {Array<number>} sampleY a sample as an array of numbers
 * @param {number} [difference=0]
 * @returns {number} test result
 * @example
 * ss.tTestTwoSample([1, 2, 3, 4], [3, 4, 5, 6], 0); //= -2.1908902300206643
 */
function tTestTwoSample(
    sampleX/*: Array<number> */,
    sampleY/*: Array<number> */,
    difference/*: number */) {
    var n = sampleX.length,
        m = sampleY.length;

    // If either sample doesn't actually have any values, we can't
    // compute this at all, so we return `null`.
    if (!n || !m) { return null; }

    // default difference (mu) is zero
    if (!difference) {
        difference = 0;
    }

    var meanX = mean(sampleX),
        meanY = mean(sampleY),
        sampleVarianceX = sampleVariance(sampleX),
        sampleVarianceY = sampleVariance(sampleY);

    if (typeof meanX === 'number' &&
        typeof meanY === 'number' &&
        typeof sampleVarianceX === 'number' &&
        typeof sampleVarianceY === 'number') {
        var weightedVariance = ((n - 1) * sampleVarianceX +
            (m - 1) * sampleVarianceY) / (n + m - 2);

        return (meanX - meanY - difference) /
            Math.sqrt(weightedVariance * (1 / n + 1 / m));
    }
}

module.exports = tTestTwoSample;

},{"./mean":35,"./sample_variance":59}],70:[function(require,module,exports){
'use strict';
/* @flow */

/**
 * For a sorted input, counting the number of unique values
 * is possible in constant time and constant memory. This is
 * a simple implementation of the algorithm.
 *
 * Values are compared with `===`, so objects and non-primitive objects
 * are not handled in any special way.
 *
 * @param {Array} input an array of primitive values.
 * @returns {number} count of unique values
 * @example
 * uniqueCountSorted([1, 2, 3]); // => 3
 * uniqueCountSorted([1, 1, 1]); // => 1
 */
function uniqueCountSorted(input/*: Array<any>*/)/*: number */ {
    var uniqueValueCount = 0,
        lastSeenValue;
    for (var i = 0; i < input.length; i++) {
        if (i === 0 || input[i] !== lastSeenValue) {
            lastSeenValue = input[i];
            uniqueValueCount++;
        }
    }
    return uniqueValueCount;
}

module.exports = uniqueCountSorted;

},{}],71:[function(require,module,exports){
'use strict';
/* @flow */

var sumNthPowerDeviations = require('./sum_nth_power_deviations');

/**
 * The [variance](http://en.wikipedia.org/wiki/Variance)
 * is the sum of squared deviations from the mean.
 *
 * This is an implementation of variance, not sample variance:
 * see the `sampleVariance` method if you want a sample measure.
 *
 * @param {Array<number>} x a population
 * @returns {number} variance: a value greater than or equal to zero.
 * zero indicates that all values are identical.
 * @example
 * variance([1, 2, 3, 4, 5, 6]); // => 2.9166666666666665
 */
function variance(x/*: Array<number> */)/*:number*/ {
    // The variance of no numbers is null
    if (x.length === 0) { return NaN; }

    // Find the mean of squared deviations between the
    // mean value and each value.
    return sumNthPowerDeviations(x, 2) / x.length;
}

module.exports = variance;

},{"./sum_nth_power_deviations":66}],72:[function(require,module,exports){
'use strict';
/* @flow */

/**
 * The [Z-Score, or Standard Score](http://en.wikipedia.org/wiki/Standard_score).
 *
 * The standard score is the number of standard deviations an observation
 * or datum is above or below the mean. Thus, a positive standard score
 * represents a datum above the mean, while a negative standard score
 * represents a datum below the mean. It is a dimensionless quantity
 * obtained by subtracting the population mean from an individual raw
 * score and then dividing the difference by the population standard
 * deviation.
 *
 * The z-score is only defined if one knows the population parameters;
 * if one only has a sample set, then the analogous computation with
 * sample mean and sample standard deviation yields the
 * Student's t-statistic.
 *
 * @param {number} x
 * @param {number} mean
 * @param {number} standardDeviation
 * @return {number} z score
 * @example
 * zScore(78, 80, 5); // => -0.4
 */
function zScore(x/*:number*/, mean/*:number*/, standardDeviation/*:number*/)/*:number*/ {
    return (x - mean) / standardDeviation;
}

module.exports = zScore;

},{}]},{},[11]);

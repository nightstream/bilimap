/**
 * BigNumber
 * @author Malte Pagel
 */
function BigNumber (byte_length, bytes_per_entry, src_typed_array) {
    
    var typed_array;
    var myself = this;
    
    /*  */
    
    function set_bit (bit, collection) {
        
        collection = collection || typed_array;
        
        if ( !bit || bit > bits * collection.length )
            return;
        
        var entry, single_bit;
        for ( var i = bit; i <= bits * collection.length; i++ ) {
            entry = collection.length - parseInt( (i - 1) / bits ) - 1;
            single_bit = (i - 1) % bits;
            if ( collection[entry] & (1 << single_bit) ) {
                collection[entry] ^= 1 << single_bit;
                continue;
            }
            collection[entry] |= 1 << single_bit;
            break;
        }
    }
    this.set_bit = set_bit;
    function unset_bit (bit, collection) {
        
        collection = collection || typed_array;
        
        if ( !bit || bit > bits * collection.length )
            return;
        
        var entry, single_bit;
        entry = collection.length - parseInt( (bit - 1) / bits ) - 1;
        single_bit = (bit - 1) % bits;
        if ( collection[entry] & (1 << single_bit) ) {
            collection[entry] ^= 1 << single_bit;
            return;
        }
        
        collection[entry] |= 1 << single_bit;
        
        for ( var i = (bit + 1); i <= bits * collection.length; i++ ) {
            entry = collection.length - parseInt( (i - 1) / bits ) - 1;
            single_bit = (i - 1) % bits;
            if ( collection[entry] & (1 << single_bit) ) {
                collection[entry] ^= 1 << single_bit;
                break;
            }
            collection[entry] |= 1 << single_bit;
        }
    }
    this.unset_bit = unset_bit;
    
    this.negate = function () {
        for ( var i = 0; i < typed_array.length; i++ )
            typed_array[i] = (~typed_array[i]) & MAX_VALUE;
    };
    this.twos_complement = function () {
        for ( var i = 0; i < typed_array.length; i++ )
            typed_array[i] = (~typed_array[i]) & MAX_VALUE;
        set_bit(1);
    };
    
    this.or = function (bignum) {
        var bignum_collection = bignum.to_collection();
        var length = Math.max(bignum_collection.length, typed_array.length);
        var result = myself.copy(length);
        var result_collection = result.to_collection();
        for ( var i = 0; i < length; i++ ) {
            if ( i < bignum_collection.length && i < typed_array.length )
                result_collection[length - i - 1] = bignum_collection[bignum_collection.length - i - 1] | typed_array[typed_array.length - i - 1];
            else {
                if ( length == typed_array.length )
                    break;
                result_collection[length - i - 1] = bignum_collection[bignum_collection.length - i - 1];
            }
        }
        return reduce(result);
    };
    this.xor = function (bignum) {
        var bignum_collection = bignum.to_collection();
        var length = Math.max(bignum_collection.length, typed_array.length);
        var result = myself.copy(length);
        var result_collection = result.to_collection();
        for ( var i = 0; i < length; i++ ) {
            if ( i < bignum_collection.length && i < typed_array.length )
                result_collection[length - i - 1] = bignum_collection[bignum_collection.length - i - 1] ^ typed_array[typed_array.length - i - 1];
            else {
                if ( length == typed_array.length )
                    result_collection[length - i - 1] = typed_array[typed_array.length - i - 1] ^ 0;
                else
                    result_collection[length - i - 1] = bignum_collection[bignum_collection.length - i - 1] ^ 0;
            }
        }
        return reduce(result);
    };
    this.and = function (bignum, do_not_reduce) {
        var bignum_collection = bignum.to_collection();
        var length = Math.max(bignum_collection.length, typed_array.length);
        var result = myself.copy(length);
        var result_collection = result.to_collection();
        for ( var i = 0; i < length; i++ ) {
            if ( i < bignum_collection.length && i < typed_array.length )
                result_collection[length - i - 1] = bignum_collection[bignum_collection.length - i - 1] & typed_array[typed_array.length - i - 1];
            else
                result_collection[length - i - 1] = 0;
        }
        if ( do_not_reduce )
            return result;
        return reduce(result);
    };
    
    function shift_left (bit) {
        
        var i;
        var entry = parseInt( bit / bits );
        if ( entry ) {
            for ( i = 0; i < typed_array.length - entry; i++ ) {
                typed_array[i] = typed_array[i + entry];
                typed_array[i + entry] = 0;
            }
        }
        bit %= bits;
        if ( bit ) {
            var tmp;
            for ( i = 0; i < typed_array.length; i++ ) {
                tmp = typed_array[i] << bit;
                typed_array[i] = tmp & MAX_VALUE;
                if ( i )
                    typed_array[i - 1] |= tmp >> bits;
            }
        }
    }
    function shift_right (bit) {
        
        var i;
        var entry = parseInt( bit / bits );
        if ( entry ) {
            for ( i = typed_array.length - 1; i >= entry; i-- ) {
                typed_array[i] = typed_array[i - entry];
                typed_array[i - entry] = 0;
            }
            if ( entry * 2 >= typed_array.length ) {
                for ( i = 0; i < entry; i++ )
                    typed_array[i] = 0;
            }
        }
        bit %= bits;
        if ( bit ) {
            var tmp;
            for ( i = typed_array.length - 1; i >= 0; i-- ) {
                if ( i < typed_array.length - 1 )
                    typed_array[i + 1] |= (typed_array[i] << (bits - bit)) & MAX_VALUE;
                typed_array[i] >>= bit;
            }
        }
    }
    
    function plus (first, second) {
        var result, overflow;
        do {
            result = first ^ second;
            overflow = (first & second) << 1;
            first = result;
            second = overflow;
        } while (overflow);
        return result;
    }
    function minus (first, second) {
        
        var result, overflow;
        var next_bit = 0;
        
        if ( !(first & 1) && !(second & 1) ) {
            first |= 1;
            second |= 1;
        }
        
        if ( second & 1 ) {
            second = ((~second) | 1) & MAX_VALUE;
            result = plus(first, second);
            next_bit = (result & ONE_ENTRY) ? 0 : ONE_ENTRY;
            result &= MAX_VALUE;
        }
        else {
            do {
                result = (first ^ second) & MAX_VALUE;
                overflow = (result & second) << 1;
                next_bit = next_bit || (overflow & ONE_ENTRY);
                first = result;
                second = overflow;
            } while (overflow);
        }
        
        return ( result | next_bit );
    }
    
    function add (first_col, second_col) {
        
        var loops = Math.min(first_col.length, second_col.length);
        var i, first_index, second_index, tmp_sum;
        for ( i = 1; i <= loops; i++ ) {
            first_index = first_col.length - i;
            second_index = second_col.length - i;
            if ( !first_col[first_index] && !second_col[second_index] )
                continue;
            tmp_sum = plus(first_col[first_index], second_col[second_index]);
            first_col[first_index] = tmp_sum & MAX_VALUE;
            if ( tmp_sum >> bits )
                set_bit( i * bits + 1, first_col );
        }
    }
    
    function subtract (first_col, second_col) {
        
        var i, tmp_sub;
        var positive = compare(first_col, second_col);
        if ( positive <= 0 ) {
            for ( i =  0; i < first_col.length; i++ ) {
                first_col[i] = 0;
            }
            return;
        }
        for ( i = first_col.length - 1; i >= 0; i-- ) {
            if ( !first_col[i] && !second_col[i] )
                continue;
            tmp_sub = minus(first_col[i], second_col[i]);
            first_col[i] = tmp_sub & MAX_VALUE;
            if ( tmp_sub >> bits )
                set_bit( (first_col.length - i) * bits + 1, second_col );
        }
    }
    
    function multiplicate (factor1, factor2) {
        
        var multiplicator_col = factor2.to_collection();
        
        var multiplicator_index, bit, to_add;
        var additions = [];
        for ( var i = 0; i < multiplicator_col.length; i++ ) {
            multiplicator_index = multiplicator_col.length - i - 1;
            if ( !multiplicator_col[multiplicator_index] )
                continue;
            for ( bit = 0; bit < bits; bit++ ) {
                if ( !(multiplicator_col[multiplicator_index] & (1 << bit)) )
                    continue;
                to_add = factor1.copy(typed_array.length * bytes_per_entry);
                to_add.shift_by(i * bits + bit);
                additions.push(to_add);
            }
        }
        
        myself.increase_by.apply(null, additions);
    }
    
    function divide (dividend, divisor, result) {
        
        var dividend_col = dividend.to_collection();
        var divisor_col = divisor.to_collection();
        
        var bit, dividend_msb;
        for ( bit = bits; bit >= 1; bit-- ) {
            if ( dividend_col[0] & (1 << (bit - 1)) ) {
                dividend_msb = bit;
                break;
            }
        }
        if ( dividend_msb )
            dividend_msb += (dividend_col.length - 1) * bits;
        if ( !divisor.msb ) {
            for ( bit = bits; bit >= 1; bit-- ) {
                if ( divisor_col[0] & (1 << (bit - 1)) ) {
                    divisor.msb = bit;
                    break;
                }
            }
            divisor.msb += (divisor_col.length - 1) * bits;
        }
        
        var shift = dividend_msb - divisor.msb;
        
        if ( !dividend_msb || shift < 0 || (shift == 0 && compare(dividend_col, divisor_col) < 0) ) {
            result.modulo = dividend;
            return;
        }
        
        var long_divisor = divisor.copy(dividend_col.length * bytes_per_entry);
        long_divisor.shift_by(shift);
        if ( shift && compare(dividend_col, long_divisor.to_collection()) < 0 ) {
            long_divisor.shift_by(-1);
            shift--;
        }
        
        set_bit(shift + 1, result.to_collection());
        dividend.decrease_by(long_divisor);
        divide(reduce(dividend), divisor, result);
    }
    
    function sqrt (src) {
        
        var src_collection = src.to_collection();
        
        var core;
        for ( var i = bits - 2; i >= 0; i -= 2 ) {
            if ( src_collection[0] & (3 << i) ) {
                core = i + 1;
                break;
            }
        }
        if ( core == null )
            return;
        core += (src_collection.length - 1) * bits;
        unset_bit(core, src_collection);
        core++;
        core /= 2;
        set_bit(core);
        
        var tmp_result, do_it;
        for ( var bit = (core - 1); bit >= 1; bit-- ) {
            tmp_result = myself.copy(src_collection.length * bytes_per_entry);
            tmp_result.shift_by(bit);
            set_bit(bit * 2 - 1, tmp_result.to_collection());
            do_it = compare( src_collection, tmp_result.to_collection() );
            if ( do_it < 0 )
                continue;
            set_bit(bit);
            if ( !do_it )
                return;
            src.decrease_by(tmp_result);
        }
    }
    
    function pow (base, exponent) {
        var exp_col = exponent.to_collection();
        if ( exp_col.length == 1 ) {
            if ( !exp_col[0] ) {
                var result = new BigNumber(1, typed_array.BYTES_PER_ELEMENT);
                result.from_number(1);
                return result;
            }
            if ( !(exp_col[0] ^ 1) )
                return reduce(base);
        }
        if ( exp_col[exp_col.length - 1] & 1 || (exp_col.length == 1 && !(exp_col[0] ^ 2)) ) {
            unset_bit(1, exp_col);
            return base.multiplicate(pow(base, exponent));
        }
        var two = new BigNumber(1, typed_array.BYTES_PER_ELEMENT);
        two.from_number(2);
        exponent.shift_by(-1);
        return pow(pow(base, two), reduce(exponent));
    }
    
    function mod_pow (base, exponent, modulo) {
        var exp_col = exponent.to_collection();
        if ( exp_col.length == 1 ) {
            if ( !exp_col[0] ) {
                var result = new BigNumber(1, typed_array.BYTES_PER_ELEMENT);
                result.from_number(1);
                return result;
            }
            if ( !(exp_col[0] ^ 1) )
                return base.mod(modulo);
        }
        if ( exp_col[exp_col.length - 1] & 1 || (exp_col.length == 1 && !(exp_col[0] ^ 2)) ) {
            unset_bit(1, exp_col);
            return base.mod(modulo).multiplicate(mod_pow(base, exponent, modulo)).mod(modulo);
        }
        var two = new BigNumber(1, typed_array.BYTES_PER_ELEMENT);
        two.from_number(2);
        exponent.shift_by(-1);
        return mod_pow(mod_pow(base, two, modulo), reduce(exponent), modulo);
    }
    
    
    function compare (first_col, second_col) {
        
        var i;
        var first_start = first_col.length;
        var second_start = second_col.length;
        for ( i = 0; i < first_col.length; i++ ) {
            if ( !first_col[i] )
                continue;
            first_start = i;
            break;
        }
        for ( i = 0; i < second_col.length; i++ ) {
            if ( !second_col[i] )
                continue;
            second_start = i;
            break;
        }
        if ( (first_col.length - first_start) != (second_col.length - second_start) )
            return (first_col.length - first_start) - (second_col.length - second_start);
        
        for ( i = 0; i < first_col.length - first_start; i++ ) {
            if ( !(first_col[i + first_start] ^ second_col[i + second_start]) )
                continue;
            if ( !(minus(first_col[i + first_start], second_col[i + second_start]) & ONE_ENTRY) )
                return 1;
            return -1;
        }
            
        return 0;
    }
    
    function reduce (big_number) {
        
        var collection = big_number.to_collection();
        if ( collection[0] )
            return big_number;
        var i, start;
        for ( i = 0; i < collection.length; i++ ) {
            if ( !collection[i] )
                continue;
            start = i;
            break;
        }
        if ( start == null )
            return new BigNumber(bytes_per_entry, collection.BYTES_PER_ELEMENT);
        var result = new BigNumber((collection.length - start) * bytes_per_entry, collection.BYTES_PER_ELEMENT);
        var result_collection = result.to_collection();
        result_collection.set(collection.slice(start));
        
        return result;
    }
    
    /*  */
    
    this.shift_by = function (bit) {
        if ( bit > 0 )
            shift_left(bit);
        if ( bit < 0 )
            shift_right(0 - bit);
    };
    
    this.increase_by = function () {
        var args = arguments.callee.arguments;
        for ( var i = 0; i < args.length; i++ )
            add(typed_array, args[i].to_collection());
    };
    this.add = function () {
        var args = arguments.callee.arguments;
        var big_numbers_to_collection = [];
        var length = typed_array.length;
        var tmp, i;
        for ( i = 0; i < args.length; i++ ) {
            tmp = args[i].to_collection();
            big_numbers_to_collection.push(tmp);
            if ( tmp.length > length )
                length = tmp.length;
        }
        length = bytes_per_entry * (length + 1 + ((big_numbers_to_collection.length + 1) >> bits));
        var result = myself.copy(length);
        var result_col = result.to_collection();
        for ( i = 0; i < big_numbers_to_collection.length; i++ )
            add(result_col, big_numbers_to_collection[i]);
        return reduce(result);
    };
    
    this.decrease_by = function () {
        var args = arguments.callee.arguments;
        var to_subtract = args[0].copy();
        if ( args.length > 1 ) {
            for ( var i = 1; i < args.length; i++ )
                to_subtract = to_subtract.add(args[i]);
        }
        subtract(typed_array, reduce(to_subtract).copy(typed_array.length * bytes_per_entry).to_collection());
    };
    this.subtract = function () {
        var result = myself.copy();
        result.decrease_by.apply(null, arguments.callee.arguments);
        return reduce(result);
    };
    
    this.multiplicate = function (arg1, arg2) {
        if ( arguments.callee.arguments.length > 1 ) {
            multiplicate(arg1, arg2);
            return;
        }
        var multiplicator_collection = arg1.to_collection();
        var result_bytes = (typed_array.length + multiplicator_collection.length) * bytes_per_entry;
        var result = new BigNumber(result_bytes, typed_array.BYTES_PER_ELEMENT);
        if ( compare(typed_array, multiplicator_collection) >= 0 )
            result.multiplicate(myself, arg1);
        else
            result.multiplicate(arg1, myself);
        return reduce(result);
    };
    
    this.divide = function (bignum, do_not_reduce) {
        var dividend = reduce(myself.copy());
        var dividend_collection = dividend.to_collection();
        var divisor = reduce(bignum);
        var divisor_collection = divisor.to_collection();
        if ( dividend_collection.length < divisor_collection.length || (divisor_collection.length == 1 && !divisor_collection[0]) )
            return new BigNumber(1, typed_array.BYTES_PER_ELEMENT);
        var result_bytes = (dividend_collection.length - divisor_collection.length) * bytes_per_entry + 1;
        var result = new BigNumber(result_bytes, typed_array.BYTES_PER_ELEMENT);
        divisor.msb = null;
        var redundant = divide(dividend, divisor, result);
        if ( do_not_reduce )
            return result;
        return reduce(result);
    };
    this.mod = function (bignum) {
        var result = myself.divide(bignum, true);
        return result.modulo || reduce(myself.copy());
    };
    
    this.sqrt = function (src) {
        if ( src ) {
            sqrt(src);
            return;
        }
        var result = new BigNumber(typed_array.length + 1, typed_array.BYTES_PER_ELEMENT);
        result.sqrt(reduce(myself.copy()));
        return reduce(result);
    };
    
    this.pow = function (raw_exp) {
        if ( (typeof raw_exp).toUpperCase() == "NUMBER" ) {
            var long_exp = new BigNumber(8, typed_array.BYTES_PER_ELEMENT);
            long_exp.from_number(raw_exp);
        }
        else
            var long_exp = raw_exp.copy();
        var exp = reduce(long_exp);
        var base = myself.copy();
        return pow(base, exp);
    };
    
    this.mod_pow = function (raw_exp, raw_mod) {
        if ( (typeof raw_exp).toUpperCase() == "NUMBER" ) {
            var long_exp = new BigNumber(8, typed_array.BYTES_PER_ELEMENT);
            long_exp.from_number(raw_exp);
        }
        else
            var long_exp = raw_exp.copy();
        var exp = reduce(long_exp);
        if ( (typeof raw_mod).toUpperCase() == "NUMBER" ) {
            var long_mod = new BigNumber(8, typed_array.BYTES_PER_ELEMENT);
            long_mod.from_number(raw_mod);
        }
        else
            var long_mod = raw_mod.copy();
        var mod = reduce(long_mod);
        var base = myself.copy();
        return mod_pow(base, exp, mod);
    };
    
    /*  */
    
    function different_base_formatted_string (input_base, output_base, collection, output_characters) {
        
        var base = input_base || ONE_ENTRY;
        output_base = output_base || 10;
        
        var i, started;
        var input = collection || [];
        if ( !input.length ) {
            for ( i = 0; i < typed_array.length; i++ ) {
                if ( !started && !typed_array[i] )
                    continue;
                started = true;
                input.push( typed_array[i] );
            }
        }
        var output = [];
        var rest;
        var position = 0;
        while ( position < input.length ) {
            rest = 0;
            for ( i = 0; i < input.length; i++ ) {
                rest = rest * base + input[i];
                input[i] = parseInt(rest / output_base);
                rest -= input[i] * output_base;
                if ( !input[i] && i == position )
                    position++;
            }
            if ( output_characters )
                output.push( output_characters[rest] );
            else
                output.push( rest );
        }
        
        output.reverse();
        
        return output.join("");
    }
    this.copy = function (bytes) {
        bytes = (bytes && bytes >= buffer.byteLength) ? bytes : buffer.byteLength;
        return new BigNumber(bytes, typed_array.BYTES_PER_ELEMENT, typed_array);
    };
    
    /*  */
    
    this.from_number = function (number) {
        
        var counter = typed_array.length - 1;
        
        typed_array[counter] = number & MAX_VALUE;
        while ( number && counter ) {
            counter--;
            number = number >> bits;
            typed_array[counter] = number & MAX_VALUE;
        }
    };
    this.from_hex = function (mixed) {
        
        var src = [];
        var i;
        var src_string = "";
        if ( (typeof mixed).toUpperCase() == "OBJECT" && mixed.length ) {
            for ( i = 0; i < mixed.length; i++ )
                src_string += mixed[i];
        }
        else
            src_string = mixed.toLowerCase().replace(/[^\da-f]/g, "");
        
        src = src_string.split("");
        
        if ( !src )
            return;
        
        var counter = typed_array.length;
        var tmp_number, number;
        var shift = 0;
        for ( i = src.length - 1; i >= 0; i-- ) {
            tmp_number = parseInt(src[i], 16);
            if ( !(shift % bits) ) {
                if ( number )
                    typed_array[counter] = number;
                shift = 0;
                number = 0;
                counter--;
            }
            number += tmp_number << shift;
            shift += 4;
        }
        
        typed_array[counter] = number;
    };
    this.from_decimal = function (string) {
        var collection = string.split("").map(function(int){return parseInt(int)});
        var output_characters = [ "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F" ];
        var translated = different_base_formatted_string(10, 16, collection, output_characters);
        myself.from_hex(translated);
    };
    this.from_base64 = function (string) {
        var asciified = atob(string).split("");
        var char_number, index;
        for ( var i = 0; i < asciified.length && i < byte_length; i++ ) {
            char_number = asciified[asciified.length - i - 1].charCodeAt(0);
            index = typed_array.length - parseInt(i / bytes_per_entry) - 1;
            if ( bytes_per_entry == 2 && i % 2 )
                char_number <<= 8;
            typed_array[index] += char_number;
        }
    };
    
    /*  */
    
    // Javascript limitations to be regarded - eventually will slowly return string
    this.to_number = function () {
        
        var shift = 0;
        
        if ( typed_array.length * bits >= 32 )
            return different_base_formatted_string() || "0";
        
        var number = 0;
        for ( var i = typed_array.length - 1; i >= 0; i-- ) {
            number += typed_array[i] << shift;
            shift += bits;
        }
        
        return number;
    };
    this.to_collection = function () {
        return typed_array;
    };
    this.to_hex = function () {
        
        var hex_digits_per_entry = bytes_per_entry * 2;
        
        var hex_number = "";
        var tmp_hex;
        for ( var i = 0; i < typed_array.length; i++ ) {
            tmp_hex = typed_array[i].toString(16);
            while ( tmp_hex.length < hex_digits_per_entry )
                tmp_hex = "0" + tmp_hex;
            hex_number += tmp_hex;
        }
        
        var copied = hex_number;
        
        do {
            hex_number = copied;
            copied = hex_number.replace(/^00/, "")
        } while ( copied != hex_number );
        
        return hex_number;
    };
    this.to_base64 = function () {
        var aciified = to_ascii();
        return btoa(aciified);
    };
    function to_ascii () {
        
        var recognised = false;
        var i, number, tmp_collection;
        var result = "";
        for ( i = 0; i < typed_array.length; i++ ) {
            if ( typed_array[i] )
                recognised = true;
            if ( !recognised )
                continue;
            number = typed_array[i];
            tmp_collection = [];
            while ( number ) {
                tmp_collection.unshift(number & 255);
                number = number >> 8;
            }
            result += String.fromCharCode.apply(null, tmp_collection);
        }
        
        return result;
    }
    
    /*  */
    
    
    
    /**
     * Constructor
     */
    while ( bytes_per_entry && byte_length % bytes_per_entry )
        byte_length++;
    
    var buffer = new ArrayBuffer(byte_length);
    
    if ( !bytes_per_entry || (bytes_per_entry != 1 && bytes_per_entry != 2) ) {
        if ( buffer.byteLength >= 2 && !(buffer.byteLength & 1) )
            bytes_per_entry = 2;
        else
            bytes_per_entry = 1;
    }
    
    if ( bytes_per_entry == 2 )
        typed_array = new Uint16Array(buffer);
    else
        typed_array = new Uint8Array(buffer);
    bytes_per_entry = typed_array.BYTES_PER_ELEMENT;
    
    if ( src_typed_array ) {
        var offset = typed_array.length - src_typed_array.length;
        typed_array.set(src_typed_array, offset);
    }
    
    var bits = bytes_per_entry * 8;
    var MAX_VALUE = 255;
    for ( var i = 1; i < bytes_per_entry; i++ ) {
        MAX_VALUE <<= 8;
        MAX_VALUE += 255;
    }
    var ONE_ENTRY = 1 << bits;
}

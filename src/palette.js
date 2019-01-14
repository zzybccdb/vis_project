var orange = 0xff8927
var blue = 0x307fb9
var green = 0x3ba63a
var red = 0xd62728
var purple = 0x9467bd
var brown = 0x8c564b
var pink = 0xe377c2
var grey = 0x7f7f7f
var gold = 0xbcbd22
var colors = [red, blue, green, orange, purple, brown, pink, grey, gold]
var idx = -1
export default {
	orange: orange,
	blue: blue,
	green: green,
	red: red,
	colors: colors,
	randomColor() {
		idx = (idx + 1) % colors.length
		return colors[idx]
	}
}
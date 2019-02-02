// Domutils 1.7.0 patched to support generator functions

var DomUtils = module.exports;

[
	require("./stringify"),
	require("./traversal"),
	require("./manipulation"),
	require("./querying"),
	require("./legacy"),
	require("./helpers")
].forEach(function(ext){
	Object.keys(ext).forEach(function(key){
		DomUtils[key] = ext[key].bind(DomUtils);
	});
});

#gulp-string-inject

Simple Gulp plugin that looks for markers `{$=pathToFile}` in source file and replace them with JavaScript strings created from 'linked' file content. Marker should point to existing text file. Current directory is the directory of source file.  
For example:  
*File1.js*
```
var Hello = {$=File2.js};
```
*File2.js*
```
World!
"Le bug" was found!
```
  
After piping File1.js through gulp-string-inject you will get 
```
var Hello = "World\r\n\"Le bug\" was found!";
```

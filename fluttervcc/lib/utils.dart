import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;

bool isDesktop() {
  if (kIsWeb) {
    return false;
  }
  return Platform.isLinux | Platform.isMacOS | Platform.isWindows;
}

Tv mapGetDefault<Tk,Tv>(Map<Tk,Tv> map, Tk key, Tv def) {
  if (map.containsKey(key)) {
    return map[key]!;
  }
  return def;
}

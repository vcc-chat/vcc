import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;

bool isDesktop() {
  if (kIsWeb) {
    return false;
  }
  return Platform.isLinux | Platform.isMacOS | Platform.isWindows;
}

mapGetDefault(Map map, dynamic key, dynamic def) {
  if (map.containsKey(key)) {
    return map[key];
  }
  return def;
}

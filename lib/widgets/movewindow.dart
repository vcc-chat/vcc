import 'package:bitsdojo_window/bitsdojo_window.dart';
import 'package:flutter/material.dart';
import 'dart:io';

bool isDesktop() {
  return Platform.isLinux | Platform.isMacOS | Platform.isWindows;
}

PreferredSize PreferredSizedMoveWindow(child) {
  if (!isDesktop()) {
    PreferredSize(
        preferredSize: Size(double.infinity, kToolbarHeight), child: child);
  }
  return PreferredSize(
      preferredSize: Size(double.infinity, kToolbarHeight),
      child: MoveWindow(child: child));
}

List<Widget> generateWindowButtons() {
  if (!isDesktop()) {
    return [];
  }
  return [
    IconButton(
      icon: Icon(
        Icons.minimize_outlined,
      ),
      onPressed: appWindow.minimize,
    ),
    IconButton(
        icon: Icon(
          Icons.rectangle_outlined,
        ),
        onPressed: appWindow.maximizeOrRestore),
    IconButton(
      icon: Icon(
        Icons.close_outlined,
      ),
      onPressed: appWindow.close,
    )
  ];
}

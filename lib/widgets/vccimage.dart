import 'package:flutter/material.dart';
import 'package:vcc/vcc.dart';
import 'dart:async';

class VccImage extends StatefulWidget {
  final String id;
  VccImage({required this.id});
  @override
  State<StatefulWidget> createState() {
    return VccImageState();
  }
}

class VccImageState extends State<VccImage> {
  Widget? image;
  @override
  void initState() {
    if (!this.mounted) {return;}
    unawaited(() async {
      print(111);
      var [_, url] = await vccClient.file_download(widget.id);
      url = url.toString();

      this.image = Image.network(
        url,
        height: 100,
      );
      setState(() {});
    }());
    super.initState();
  }

  Widget build(BuildContext build) {
    return this.image ?? SizedBox.shrink();
  }
}

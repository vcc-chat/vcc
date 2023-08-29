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
    unawaited(() async {
      var [_, url] = await vccClient.file_download(widget.id);
      url=url.toString();
      setState(() {
        this.image = Image.network(url,height: 100,);
      });
    }());
    super.initState();
  }

  Widget build(BuildContext build) {
    return this.image ?? SizedBox.shrink();
  }
}

import 'package:flutter/material.dart';
import 'package:vcc/vcc.dart';

class VccImage extends StatelessWidget {
  late String id;
  late Future future;
  VccImage({required id}) {
    print("a1");
    this.id = id;
    this.future=vccClient.file_download(id);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: this.future,
      builder: (BuildContext context, AsyncSnapshot snapshot) {
        if (!snapshot.hasData) {
          return CircularProgressIndicator();
        }
        ;
        var url = snapshot.data[1].toString();
        return Image.network(
          url,
          height: 100,
        );
      },
    );
  }
}

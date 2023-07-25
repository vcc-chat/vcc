import 'package:flutter/material.dart';

class ChatBar extends StatelessWidget {
  final void Function(String)? send;
  String message = "";
  ChatBar({this.send}) {}
  Widget build(BuildContext context) {
    var controler = TextEditingController();
    var node = FocusNode();
    Widget field = TextField(
      focusNode: node,
      controller: controler,
      decoration: InputDecoration(
        enabledBorder: const UnderlineInputBorder(
          borderSide: BorderSide(color: Colors.transparent),
        ),
        focusedBorder: const UnderlineInputBorder(
          borderSide: BorderSide(color: Colors.transparent),
        ),
        suffixIcon: IconButton(
          icon: Icon(Icons.send),
          onPressed: () {
            if (this.message != "") {
              this.send!(this.message);
            }
          },
        ),
      ),
      onChanged: (String str) {
        this.message = str;
      },
      onSubmitted: (String msg) {
        if (this.message != "") {
          this.send!(msg);
        }
        controler.clear();
        node.requestFocus();
      },
    );
    return Container(
        decoration:BoxDecoration(borderRadius: BorderRadius.all(Radius.circular(20.0)),),
        alignment: Alignment(0, 0),
        child: Material(
            elevation: 100000,
            color: Theme.of(context).colorScheme.background,
            surfaceTintColor: Theme.of(context).colorScheme.primary,
            child:field
                ));
  }
}

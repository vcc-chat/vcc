import 'package:flutter/material.dart';

class ChatBar extends StatefulWidget {
  final void Function(String)? send;
  final List<Widget> additionButtons;
  const ChatBar({super.key, this.send, this.additionButtons = const []});

  @override
  State<ChatBar> createState() => ChatBarState();
}

class ChatBarState extends State<ChatBar> {
  String message = "";
  Widget build(BuildContext context) {
    var controler = TextEditingController();
    var node = FocusNode();
    Widget field = TextField(
      key: widget.key,
      focusNode: node,
      controller: controler,
      decoration: InputDecoration(
        enabledBorder: const UnderlineInputBorder(
          borderSide: BorderSide(color: Colors.transparent),
        ),
        focusedBorder: const UnderlineInputBorder(
          borderSide: BorderSide(color: Colors.transparent),
        ),

        suffixIcon:  Row(
          mainAxisAlignment: MainAxisAlignment.end,
          mainAxisSize: MainAxisSize.min,
          children: this.widget.additionButtons+[IconButton(
              icon: Icon(Icons.send),
              onPressed: () {
                if (this.message != "") {
                  widget.send!(this.message);
                  controler.clear();
                  setState(() {});
                }
              })],
        ),
      ),
      onChanged: (String str) {
        this.message = str;
      },
      onSubmitted: (String msg) {
        if (this.message != "") {
          widget.send!(msg);
        }
        controler.clear();
        setState(() {});
        node.requestFocus();
      },
    );
    return Material(
        shape: RoundedRectangleBorder(
          borderRadius: new BorderRadius.circular(8.0),
        ),
        elevation: 100000,
        color: Theme.of(context).colorScheme.background,
        surfaceTintColor: Theme.of(context).colorScheme.primary,
        child: Container(
            padding: EdgeInsets.only(left: 6),
            color: Colors.transparent,
            child: field));
  }
}

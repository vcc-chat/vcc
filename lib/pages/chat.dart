import 'dart:async';
import 'package:flutter/material.dart';
import '../vcc.dart';

class ChatPage extends StatefulWidget {
  const ChatPage({super.key});

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  var chats = [];
  _ChatPageState() {
    unawaited(this.updateChats());
  }
  updateChats() async {
    this.chats = await (vccClient.list_chat());
    setState(() {});
  }
    List currentChat=[0,"",""];
  Widget build(BuildContext context) {
    List<Widget> chatsItem = [];
    for (var i in this.chats) {
      chatsItem.add(ListTile(
        title: Text(i[1]),
        onTap: () {
          setState(() {
            this.currentChat = i;
          });
        },
      ));
    }
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: Text("Chat"),
      ),
      body: Row(
        children: [
          SizedBox(
              width: 180,
              child: ListView(
                children: chatsItem,
              )),
          Divider(
            height: 10,
            indent: 1,
            color: Theme.of(context).dividerColor,
          ),
          Expanded(
              child: Container(
            child: Text(this.currentChat[1]),
          ))
        ],
      ),
    );
  }
}

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:chat_bubbles/chat_bubbles.dart';
import 'package:vcc/vcc.dart';
import 'package:vcc/widgets/chatbar.dart';

class ChatPage extends StatefulWidget {
  const ChatPage({super.key});

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  var chats = [];
  var messages = [];
  _ChatPageState() {
    vccClient.message.listen((message) {
      print(message);
      if (message['uid'] == this.currentChat[0]) {
        setState(() {
          this.messages.add(message);
        });
      }
    });
    unawaited(this.updateChats());
  }
  updateChats() async {
    this.chats = await (vccClient.list_chat());
    setState(() {});
  }

  List currentChat = [0, "", ""];
  Widget build(BuildContext context) {
    List<Widget> chatsItem = [];
    List<Widget> messages = [];
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

    for (var i in this.messages) {
      messages.add(BubbleNormal(
        text: i['msg'],
        color: Color(0xFF1B97F3),
      ));
    }
    return Scaffold(
      drawer: Drawer(child: Text("hello")),
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: Text("Chat - ${currentChat[1]}"),
        actions: [
          IconButton(
            icon: Icon(Icons.expand_more),
            onPressed: () {},
          )
        ],
      ),
      body: Container(margin: EdgeInsets.only(bottom: 8,right: 5),child:Row(
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
              child: Column(children: [
            Expanded(
                child: ListView(
              children: messages,
            )),
            ChatBar(send: (msg) {
              vccClient.send_message(this.currentChat[0], msg);
            })
          ]))
        ],
      )),
    );
  }
}

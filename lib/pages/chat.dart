import 'dart:async';
import 'package:flutter/material.dart';
import 'package:chat_bubbles/chat_bubbles.dart';
import 'package:vcc/vcc.dart';
import 'package:vcc/widgets/chatbar.dart';

int MAX_MESSAGES = 10;

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
      if (message['chat'] == this.currentChat[0]) {
        setState(() {
          if (this.messages.length > MAX_MESSAGES) {
            this.messages = this.messages.skip(1).toList();
          }
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
    var shortestSide = MediaQuery.of(context).size.shortestSide;
    bool useMobileLayout = shortestSide < 600;

    List<Widget> chatsItem = [];
    List<Widget> messages = [];
    for (var i in this.chats) {
      chatsItem.add(ListTile(
        selected:i[0]==this.currentChat[0],
        title: Text(i[1]),
        onTap: () {
          setState(() {
            this.currentChat = i;
            this.messages.clear();
          });
        },
      ));
    }
    Widget chatList = ListView(children: chatsItem);
    for (var i in this.messages) {
      messages.add(BubbleNormal(
        text: i['msg'],
        color: Color(0xFF1B97F3),
      ));
    }
    late ChatBar chatBar;
    chatBar = ChatBar(send: (msg) {
      vccClient.send_message(this.currentChat[0], msg);
    });
    return Scaffold(
      drawer: useMobileLayout ? Drawer(child: chatList,backgroundColor: Theme.of(context).drawerTheme.backgroundColor) : null,
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
      body: Container(
          margin: EdgeInsets.only(bottom: 8, right: 5),
          child: Row(
            children: [
              (!useMobileLayout)
                  ? (SizedBox(
                      width: 180,
                      child: Container(
                          color: Theme.of(context).colorScheme.onPrimary,
                          child: chatList)))
                  : Container(),
              Expanded(
                  child: Column(children: [
                Expanded(
                    child: ListView(
                  children: messages,
                )),
                Container(margin:EdgeInsets.only(left:7),child:chatBar)
              ]))
            ],
          )),
    );
  }
}

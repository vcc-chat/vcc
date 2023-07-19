import 'dart:async';
import 'package:flutter/material.dart';
import 'package:chat_bubbles/chat_bubbles.dart';
import 'package:vcc/vcc.dart';
import 'package:vcc/widgets/chatbar.dart';
import 'package:vcc/widgets/movewindow.dart';

int MAX_MESSAGES = 1000;

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

  genFakeMessages() {
    for (var i = 0; i < 10; i = i + 1) {
      this.messages.add({
        'uid': 1,
        "chat": this.currentChat[0],
        "msg": "hello $i",
        "username": "Dummy user $i"
      });
    }
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
        selected: i[0] == this.currentChat[0],
        title: Text(i[1]),
        onTap: () {
          setState(() {
            this.currentChat = i;
            this.messages.clear();
          });
        },
      ));
    }
    Widget chatList = Column(children: [
      Expanded(child: ListView(children: chatsItem)),
      ListTile(
        title: Center(child: Text("Join chat")),
        onTap: () {
          print("a");
        },
      )
    ]);
    for (var i in this.messages) {
      bool isSender = i['username'] == vccClient.username;
      Widget avs = CircleAvatar(child: Text("${i['username'][0]}"));
      messages.add(
        Row(children: [
          isSender
              ? SizedBox.shrink()
              : Align(alignment: Alignment.topLeft, child: avs),
          Expanded(
              child: Column(children: [
            SizedBox.shrink(),
            Align(
                alignment: isSender ? Alignment.topRight : Alignment.topLeft,
                child: Text("    ${i['username']}    ")),
            BubbleNormal(
              text: i['msg'],
              isSender: isSender,
              color: Color(0xFF1B97F3),
            ),
            SizedBox(
              height: 9,
            )
          ])),
          isSender ? avs : SizedBox.shrink(),
        ]),
      );
    }
    //print(Colors.red);
    late ChatBar chatBar;
    chatBar = ChatBar(send: (msg) {
      vccClient.send_message(this.currentChat[0], msg);
    });

    return Scaffold(
      drawer: useMobileLayout ? Drawer(child: chatList) : null,
      appBar: PreferredSizedMoveWindow(AppBar(
        //backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: Text("Chat - ${currentChat[1]}"),
        actions: <Widget>[
              PopupMenuButton(
                itemBuilder: (context) => [
                  PopupMenuItem(
                      onTap: this.genFakeMessages,
                      child: Text("Generate fake messages (developer only)")),
                ],
              )
            ] +
            generateWindowButtons(),
      )),
      body: Container(
          margin: useMobileLayout ? EdgeInsets.only(left: 8, right: 5) : null,
          child: Row(
            children: [
              (!useMobileLayout)
                  ? (SizedBox(
                      width: 180,
                      child: Material(
                          elevation: 1,
                          color: Theme.of(context).colorScheme.surface,
                          surfaceTintColor:
                              Theme.of(context).colorScheme.surfaceTint,
                          child: chatList)))
                  : Container(),
              Expanded(
                  child: Column(children: [
                Expanded(
                    child: Container(
                        margin: EdgeInsets.only(left: 7, right: 7),
                        child: ListView(reverse: true, children: [
                          for (final element in messages.reversed.toList())
                            element
                        ]))),
                Container(
                    margin:
                        EdgeInsets.only(left: 7, right: 7, bottom: 5, top: 8),
                    child: chatBar)
              ]))
            ],
          )),
    );
  }
}

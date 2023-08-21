import 'dart:async';
import 'package:flutter/material.dart';
import 'package:chat_bubbles/chat_bubbles.dart';
import 'package:vcc/vcc.dart';
import 'package:vcc/widgets/chatbar.dart';
import 'package:vcc/widgets/movewindow.dart';
import 'package:vcc/widgets/dialog.dart';
import 'package:vcc/utils.dart';

int MAX_MESSAGES = 1000;

class ChatPage extends StatefulWidget {
  const ChatPage({super.key});

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class CreateChatDialog extends StatelessWidget {
  late String value;
  late bool public = true;
  Widget build(BuildContext context) {
    return DialogBase(
      title: "Create chat",
      child: Column(
        children: [
          SizedBox(
              width: 300,
              child: TextField(
                onChanged: (value) {
                  this.value = value;
                },
              )),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text("Public"),
              Checkbox(
                value: this.public,
                onChanged: (_) {
                  this.public = !this.public;
                },
              ),
            ],
          ),
        ],
      ),
      submitted_text: "Create chat",
      onSubmitted: () {
        vccClient.create_chat(this.value, this.public);
        Navigator.pop(context);
      },
    );
  }
}

class _ChatPageState extends State<ChatPage> {
  var chats = [];
  late Widget chatbar;
  bool drawerOpened = false;
  Map<int, List> messages = {};
  _ChatPageState() {
    this.chatbar = ChatBar(send: (msg) {
      print(msg);
      vccClient.send_message(this.currentChat[0], msg);
    });
    vccClient.message.listen((message) {
      setState(() {
        int chat = message['chat'];
        if (!this.messages.containsKey(chat)) {
          this.messages[chat] = [];
        }
        this.messages[chat]!.add(message);
      });
      //   if (message['chat'] == this.currentChat[0]) {
      //     setState(() {
      //       if (this.messages.length > MAX_MESSAGES) {
      //         this.messages = this.messages.skip(1).toList();
      //       }
      //       this.messages.add(message);
      //     });
      //   }
    });
    unawaited(this.updateChats());
  }
  updateChats() async {
    this.chats = await (vccClient.list_chat());
    setState(() {});
  }

  genFakeMessages() {
    if (!this.messages.containsKey(this.currentChat[0])) {
      this.messages[this.currentChat[0]] = [];
    }
    for (var i = 0; i < 10; i = i + 1) {
      (this.messages[this.currentChat[0]] ?? []).add({
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
    if (!useMobileLayout) {
      this.drawerOpened = false;
    }
    List<Widget> chatsItem = [];
    List<Widget> messages = [];
    for (var i in this.chats) {
      Map lastmessage = List.from(mapGetDefault(this.messages, i[0], [
            {"msg": ""}
          ])).lastOrNull ??
          {};
      String message = mapGetDefault(lastmessage, "msg", "");
      if (message.length >= 10) {
        message = message.substring(0, 10) + "...";
      }
      String chatName = i[1];
      if (chatName.length >= 17) {
        chatName = chatName.substring(0, 17) + "...";
      }
      var username = mapGetDefault(lastmessage, "username", null);
      if (username != null) {
        username = username + ": ";
      } else {
        username = "";
      }
      late ListTile tile;
      Text chatId = Text("Chat id: ${i[0]}",
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color:
                    Theme.of(context).textTheme.bodySmall?.color?.withAlpha(50),
              ));

      tile = ListTile(
        selected: i[0] == this.currentChat[0],
        trailing: IconButton(
          onPressed: () {
            //if (DrawerController.of(context)) {
            if (this.drawerOpened) {
              Navigator.pop(context);
            }
            showDialog(
                context: context,
                builder: (BuildContext context) {
                  return SimpleDialog(
                    title: Text("Chat"),
                    children: [
                      Padding(
                          padding: const EdgeInsets.all(8.0),
                          child: Row(
                            children: [Text("Chatname: ${i[1]}")],
                          ))
                    ],
                  );
                });
          },
          icon: Icon(Icons.more_vert),
        ),
        title: Wrap(
          alignment: WrapAlignment.spaceBetween,
          children: [
            Text(
              chatName,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            chatId
          ],
        ),
        subtitle: Text(
          "${username}$message",
          style: Theme.of(context).textTheme.bodySmall,
        ),
        onTap: () {
          setState(() {
            this.currentChat = i;
          });
        },
      );
      chatsItem.add(tile);
    }
    Widget chatList = Column(children: [
      Expanded(child: ListView(children: chatsItem)),
      ListTile(
        title: Center(child: Text("Join chat")),
        onTap: () {
          showDialog(
              context: context,
              builder: (BuildContext ctx) =>
                  TextInputDialog("Join Chat", "Join", (String chatid) {
                    unawaited(() async {
                      var res = false;
                      try {
                        var res = await vccClient.join_chat(int.parse(chatid));
                      } catch (error) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                          content:
                              Text("Failed to join, is your chatid a number?"),
                        ));
                      }
                      if (res) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                          content: Text("Join success"),
                        ));
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                          content: Text(
                              "Failed to join, are you already in the chat?"),
                        ));
                      }
                      unawaited(this.updateChats());
                    }());
                  }));
        },
      ),
      ListTile(
        title: Center(
          child: Text("Create chat"),
        ),
        onTap: () {
          showDialog(
              context: context,
              builder: (BuildContext context) => CreateChatDialog());
        },
      )
    ]);
    for (var i in this.messages[this.currentChat[0]] ?? []) {
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
    return Scaffold(
      onDrawerChanged: (val) {
        this.drawerOpened = val;
        print(val);
      },
      backgroundColor: (!useMobileLayout & isDesktop())
          ? Colors.transparent
          : Theme.of(context).backgroundColor,
      drawer: useMobileLayout
          ? Drawer(
              child: chatList,
            )
          : null,
      appBar: PreferredSizedMoveWindow(AppBar(
        title: Text("Chat - ${currentChat[1]}"),
        actions: <Widget>[
              PopupMenuButton(
                itemBuilder: (context) => [
                  PopupMenuItem(
                      onTap: this.genFakeMessages,
                      child: Text("Generate fake messages (developer only)")),
                  PopupMenuItem(
                      onTap: vccClient.reconnect, child: Text("Reconnect")),
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
                      width: 230,
                      child: Material(
                          elevation: 1,
                          color: Theme.of(context)
                              .colorScheme
                              .surface
                              .withAlpha(200),
                          surfaceTintColor:
                              Theme.of(context).colorScheme.surfaceTint,
                          child: chatList)))
                  : Container(),
              Expanded(
                  child: Container(
                      color: Theme.of(context).backgroundColor,
                      child: Column(children: [
                        Expanded(
                            child: Container(
                                margin: EdgeInsets.only(left: 7, right: 7),
                                child: ListView(reverse: true, children: [
                                  for (final element
                                      in messages.reversed.toList())
                                    element
                                ]))),
                        Container(
                            margin: EdgeInsets.only(
                                left: 7, right: 7, bottom: 5, top: 8),
                            child: this.chatbar)
                      ])))
            ],
          )),
    );
  }
}

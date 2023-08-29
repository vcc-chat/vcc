import 'dart:async';
import 'dart:ui';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:http/http.dart';
//import 'package:chat_bubbles/chat_bubbles.dart';
import 'package:file_picker/file_picker.dart';
import 'package:vcc/vcc.dart';
import 'package:vcc/widgets/chatbar.dart';
import 'package:vcc/widgets/vccimage.dart';
import 'package:vcc/widgets/chatbubble.dart';
import 'package:vcc/widgets/movewindow.dart';
import 'package:vcc/widgets/dialog.dart';
import 'package:vcc/utils.dart';

import 'package:dual_screen/dual_screen.dart';

int MAX_MESSAGES = 1000;

class ChatPage extends StatefulWidget {
  const ChatPage({super.key});

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class ChatMessage extends StatelessWidget {
  String username;
  String message;
  ChatMessage({required this.username, required this.message});
  Widget build(BuildContext context) {
    bool isSender = this.username == vccClient.username;
    Widget avs = CircleAvatar(child: Text("${username[0]}"));
    late Widget content;
    if (RegExp(r"::file{#(.+)}").hasMatch(message)) {
      RegExpMatch match = RegExp(r"::file{#(.+)}").firstMatch(message)!;
      // content = Text("File ${match.group(1)}",
      //     style: TextStyle(
      //       color: Colors.black87,
      //       fontSize: 16,
      //     ));
      // print("File ${match.group(1)}");
      content=VccImage(id:match.group(1)!);
    } else {
      print(1);
      content = Text(
        this.message,
        style: TextStyle(
          color: Colors.black87,
          fontSize: 16,
        ),
      );
    }
    return Row(children: [
      isSender
          ? SizedBox.shrink()
          : Align(alignment: Alignment.topLeft, child: avs),
      Expanded(
          child: Column(children: [
        SizedBox.shrink(),
        Align(
            alignment: isSender ? Alignment.topRight : Alignment.topLeft,
            child: Text("    ${this.username}    ")),
        ChatBubble(
          child: content,
          isSender: isSender,
          color: Color(0xFF1B97F3),
        ),
        SizedBox(
          height: 9,
        )
      ])),
      isSender ? avs : SizedBox.shrink(),
    ]);
  }
}

/*
class ChatProperties extends StatefulWidget {
  @override
  State<ChatPage> createState() => _ChatPropertiesState();
}

class _ChatPropertiesState extends State<ChatProperties> {}
*/
class CreateChatDialog extends StatelessWidget {
  Future<Null> Function() updateChats;
  CreateChatDialog({required this.updateChats});
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
        unawaited(() async {
          await vccClient.create_chat(this.value, this.public);
          await this.updateChats();
        }());
      },
    );
  }
}

class _ChatPageState extends State<ChatPage> {
  var chats = [];
  late Widget chatbar;
  bool drawerOpened = false;
  bool shownChat = false;
  Map<int, List> messages = {};
  Map<int, List<Widget>> messageWidgets = {};
  _ChatPageState() {
    this.chatbar = ChatBar(
        additionButtons: [
          IconButton(
            onPressed: () {
              unawaited(() async {
                FilePickerResult? pickerResult =
                    await FilePicker.platform.pickFiles(withReadStream: true);
                if (pickerResult == null) {
                  return;
                }
                PlatformFile file = pickerResult.files.last;
                Stream<List<int>> stream = file.readStream!;
                int length = file.size;
                int sent = 0;

                var [id, uri] = await vccClient.file_upload(file.name);

                StreamedRequest request = StreamedRequest("PUT", uri)
                  ..contentLength = length
                  ..headers[HttpHeaders.contentTypeHeader] = 'application/data';
                stream.listen((data) {
                  sent = sent + data.length;
                  request.sink.add(data);
                  if (sent >= length) {
                    unawaited(request.sink.close());
                  }
                });
                Response response =
                    await request.send().then(Response.fromStream);
                if (response.statusCode != 200) {
                  return;
                }
                vccClient.send_message(this.currentChat[0], "::file{#$id}");
              }());
            },
            icon: Icon(Icons.upload),
          )
        ],
        send: (msg) {
          print(msg);
          vccClient.send_message(this.currentChat[0], msg);
        });

    //   if (message['chat'] == this.currentChat[0]) {
    //     setState(() {
    //       if (this.messages.length > MAX_MESSAGES) {
    //         this.messages = this.messages.skip(1).toList();
    //       }
    //       this.messages.add(message);
    //     });
    //   }
    vccClient.message.listen((msg) {
      setState(() {
        this.addMessage(msg);
      });
    });
    unawaited(this.updateChats());
  }
  addMessage(message) {
    print(message);
    int chat = message['chat'];
    if (!this.messages.containsKey(chat)) {
      this.messages[chat] = [];
      this.messageWidgets[chat] = [];
    }
    this.messageWidgets[chat]!.add(
        ChatMessage(username: message['username'], message: message['msg']));
    this.messages[chat]!.add(message);
  }

  Future<Null> updateChats() async {
    this.chats = await (vccClient.list_chat());
    setState(() {});
  }

  genFakeMessages() {
    if (!this.messages.containsKey(this.currentChat[0])) {
      this.messages[this.currentChat[0]] = [];
    }
    for (var i = 0; i < 10; i = i + 1) {
      this.addMessage({
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
    var query = MediaQuery.of(context);
    bool useMobileLayout = query.size.shortestSide < 600;
    bool isFlod = false;
    if (query.displayFeatures.isNotEmpty) {
      isFlod = query.displayFeatures.first.type == DisplayFeatureType.fold;
    }
    List<Widget> chatsItem = [];
    List<Widget> messages = mapGetDefault<dynamic, List<Widget>>(
        this.messageWidgets, this.currentChat[0], <Widget>[]);

    for (var i in this.chats) {
      Map<String, dynamic> lastmessage =
          mapGetDefault<int, List>(this.messages, i[0], [
                {"msg": ""}
              ]).lastOrNull ??
              {};

      String message = mapGetDefault<dynamic, dynamic>(lastmessage, "msg", "");
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
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.start,
                            children: [
                              Text("Chatname: ${i[1]}"),
                              Text("Chat id: ${i[0]}"),
                            ],
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
            this.shownChat = true;
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
                        res = await vccClient.join_chat(int.parse(chatid));
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
              builder: (BuildContext context) => CreateChatDialog(
                  updateChats: this.updateChats as Future<Null> Function()));
        },
      )
    ]);
    //print(Colors.red);
    return Scaffold(
      onDrawerChanged: (val) {
        this.drawerOpened = val;
        print(val);
      },
      backgroundColor: (!useMobileLayout & isDesktop())
          ? Colors.transparent
          : Theme.of(context).backgroundColor,
      // drawer: useMobileLayout
      //     ? Drawer(
      //         child: chatList,
      //       )
      //     : null,
      appBar: PreferredSizedMoveWindow(AppBar(
        leading: (!(isFlod | !useMobileLayout) & this.shownChat)
            ? IconButton(
                icon: const Icon(Icons.close),
                onPressed: () {
                  setState(() {
                    this.shownChat = false;
                  });
                })
            : null,
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
          //margin: useMobileLayout ? EdgeInsets.only(left: 8, right: 5) : null,
          child: TwoPane(
              paneProportion: 300 / query.size.width,
              panePriority: useMobileLayout
                  ? (this.shownChat
                      ? TwoPanePriority.end
                      : TwoPanePriority.start)
                  : TwoPanePriority.both,
              startPane: Material(
                  elevation: 1,
                  color: Theme.of(context).colorScheme.surface.withAlpha(200),
                  surfaceTintColor: Theme.of(context).colorScheme.surfaceTint,
                  child: chatList),
              endPane: Container(
                  color: Theme.of(context).backgroundColor,
                  child: Column(children: [
                    Expanded(
                        child: Container(
                            margin: EdgeInsets.only(left: 7, right: 7),
                            child: ListView(reverse: true, children: [
                              for (final element in messages.reversed.toList())
                                element
                            ]))),
                    Container(
                        margin: EdgeInsets.only(
                            left: 7, right: 7, bottom: 5, top: 8),
                        child: this.chatbar)
                  ])))),
    );
  }
}

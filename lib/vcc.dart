import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:json_rpc_2/json_rpc_2.dart';
import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';

saveToken(String token) async {
  SharedPreferences sharedPreferences = await SharedPreferences.getInstance();
  await sharedPreferences.setString('vcc_token', token);
}

getToken() async {
  SharedPreferences sharedPreferences = await SharedPreferences.getInstance();
  return await sharedPreferences.getString('vcc_token');
}

class VccClient {
  late WebSocketChannel connection;
  late Peer peer;
  late StreamController _messages;
  late Stream message;
  bool connected = false;
  String server = "";
  VccClient() {
    this._messages = StreamController<Map>();
    this.message = this._messages.stream;
  }
  connect(server) async {
    if (this.connected) {
      return;
    }
    this.server = server;
    Uri url = Uri.parse(server);
    this.connection = WebSocketChannel.connect(url);
    this.peer = Peer(this.connection.cast());
    this.peer.registerMethod("message", (Parameters message) {
      this._messages.add(message.asMap);
    });
    unawaited(this.peer.listen());
    this.connected = true;
  }

  login(String username, String password) async {
    return await this
        .peer
        .sendRequest("login", {"username": username, "password": password});
  }

  list_chat() async {
    return await this.peer.sendRequest("chat_list");
  }

  send_message(int chat, String message) {
    return this.peer.sendNotification("message", {"chat": chat, "msg": message});
  }
}

VccClient vccClient = VccClient();

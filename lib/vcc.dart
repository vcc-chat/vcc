import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:json_rpc_2/json_rpc_2.dart';
import 'dart:async';

class VccClient {
  late WebSocketChannel connection;
  late Peer peer;
  late StreamController _messages;
  late Stream message;
  bool connected = false;

  VccClient() {
    this._messages = StreamController<Map>();
    this.message=this._messages.stream
  }
  connect(server) async {
    if (this.connected) {
      return;
    }
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
}

VccClient vccClient = VccClient();

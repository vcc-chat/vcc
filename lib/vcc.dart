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
  String token = "";
  String username = "";
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
    this.peer = Peer(this.connection.cast(), onUnhandledError: (e, ee) {
      print("oh no!");
    });
    this.peer.registerMethod("message", (Parameters message) {
      this._messages.add(message.asMap);
    });
    unawaited(this.peer.listen());
    this.connected = true;
  }

  reconnect() async {
    this.peer.close();
    this.connected = false;
    this.connect(this.server);
    Map result =
        await this.peer.sendRequest("token_login", {"token": this.token});
  }

  login(String username, String password) async {
    Map result = await this
        .peer
        .sendRequest("login", {"username": username, "password": password});
    if (result['success']) {
      this.username = username;
      this.token = result['token'];
      return true;
    }
    return false;
  }

  register(String username, String password) async {
    bool result = await this
        .peer
        .sendRequest("register", {"username": username, "password": password});
    return result;
  }

  list_chat() async {
    return await this.peer.sendRequest("chat_list");
  }

  join_chat(int chatid) async {
    return await this.peer.sendRequest("chat_join", {"chat": chatid});
  }

  create_chat(String name, bool public) async {
    int chatid = await this
        .peer
        .sendRequest("chat_create", {'name': name, 'parent': -1});
    await this.peer.sendRequest("chat_modify_permission",
        {'chat': chatid, 'name': "public", "value": public});
  }

  send_message(int chat, String message) {
    return this.peer.sendRequest(
        "message", {"chat": chat, "msg": message, "session": null});
  }

  request_oauth(String platform) async {
    Map ret = await this.peer.sendRequest("request_oauth", {platform});
    return [this.login_oauth(platform, ret['request_id']), ret['url']];

  }

  login_oauth(String platform, String requestid) async {
    Map ret = await this.peer.sendRequest("login_oauth", {platform, requestid});
    this.token = ret["token"];
    print(ret);
    return [this.token, ret["username"]];
  }
}

VccClient vccClient = VccClient();

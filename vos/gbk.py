import vos
import asyncio
import sys
sys.stdin=open("/dev/stdin",encoding="GBK")
sys.stdout=open("/dev/stdout","w",encoding="GBK")
#import _locale
#_locale._getdefaultlocale = (lambda *args: ['en_US', 'gbk'])
#
#def utf8_to_gbk(utf8_str):
#    gbk_str = utf8_str.encode('gbk').decode('gbk')
#    return gbk_str
#
#def gbk_to_utf8(gbk_str):
#    utf8_str=gbk_str.encode('gbk').decode('gbk').encode("utf8").decode("utf8")
#    return utf8_str
#    
class mainapp_gbk(vos.mainapp):
    pass
#    def append_message(self,username, msg, chat, session):
#        msg=utf8_to_gbk(msg)
#        super().append_message(username, msg, chat, session)
#    def send_message(self,buffer):
#        buffer.text=gbk_to_utf8(buffer.text)
#        super().send_message(buffer)
if __name__ == "__main__":
    vos.init()
    asyncio.run(mainapp_gbk({"username": sys.argv[1], "password": sys.argv[2]}).run())

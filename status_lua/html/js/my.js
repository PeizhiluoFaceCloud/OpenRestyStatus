function verifyName(name){  
    var message = "";  
    if(name == ''){  
        message = "姓名不能为空！";  
    }else{  
      message = "OK";  
    }
    return message
}
function verifyAuthCode(authcode){  
    var message = "";  
    if(authcode == ''){  
        message = "验证码不能为空！";  
    }else{  
      message = "OK";  
    }
    return message
}
function verifyPhone(phone){  
    var message = "";  
    var myreg = /^(((13[0-9]{1})|(14[0-9]{1})|(17[0]{1})|(15[0-3]{1})|(15[5-9]{1})|(18[0-9]{1}))+\d{8})$/;         
    if(phone == ''){  
        message = "手机号码不能为空！";  
    }else if(phone.length !=11){  
        message = "请输入有效的手机号码！";  
    }else if(!myreg.test(phone)){  
        message = "请输入有效的手机号码！";  
    }else{  
      message = "OK";  
    }
    return message
}
function verifyEmail(email){  
    var message = "";  
    var myreg = /^([a-zA-Z0-9_-])+@([a-zA-Z0-9_-])+((\.[a-zA-Z0-9_-]{2,3}){1,2})$/;         
    if(email == ''){  
        message = "邮箱不能为空！";  
    }else if(!myreg.test(email)){  
        message = "邮箱格式不正确！";  
    }else{  
      message = "OK";  
    }
    return message
}
function getHttpObj() {  
    var httpobj = null;  
    try {  
        httpobj = new ActiveXObject("Msxml2.XMLHTTP");  
    }  
    catch (e) {  
        try {  
            httpobj = new ActiveXObject("Microsoft.XMLHTTP");  
        }  
    catch (e1) {  
        httpobj = new XMLHttpRequest();  
        }  
    }  
    return httpobj;  
}

function sendAuthCode(phone) 
{
    var xmlhttp = getHttpObj();  
    var sms_server_addr = $.trim($('#sms_server_addr').text())
    xmlhttp.open("POST","http://"+sms_server_addr+"/",true);
    //xmlhttp.open("POST","http://10.2.12.99:8002/",true);
    xmlhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;");//缺少这句，后台无法获取参数  
    xmlhttp.onreadystatechange=function()
    {
        if (xmlhttp.readyState==4 && xmlhttp.status==200)
        {
            //应答消息
            var jsonResponse = JSON.parse(xmlhttp.responseText);
            if(jsonResponse["DDIP"]["Header"]["ErrorNum"] != "200")
            {
                alert("发送失败!"+jsonResponse["DDIP"]["Header"]["ErrorString"]);
                return false;
            }
        }
    }
    //---组织内容
    var jsonRequest = { "DDIP": {
                            "Body": {
                                "Project": "",
                                "PhoneNumber": ""
                            },
                            "Header": {
                                "CSeq": "1",
                                "MessageType": "MSG_AUTHCODE_REQ",
                                "Version": "1.0"
                            }
                        }};
    jsonRequest["DDIP"]["Body"]["Project"] = $.trim($('#projectname').text());
    jsonRequest["DDIP"]["Body"]["PhoneNumber"] = phone;

    //发送注册请求
    var strRequest = JSON.stringify(jsonRequest);
    xmlhttp.send(strRequest);
}

//简单的事件处理程序，响应自onChange,onSelect事件，按照上面的Jcrop调用
var target_face = null;
var jcrop_api = null;
function facefile_change() 
{
    if(jcrop_api != null){
        jcrop_api.destroy();
    }

    var r= new FileReader();
    f=document.getElementById('facefile').files[0];
    r.readAsDataURL(f);
    r.onload=function (e) 
    {
        //把图片显示出来
        var image = document.getElementById('showface'); 
        image.onload = function(){
            //选了一个crop窗口
            /*$('#showface').Jcrop();*/
            jcrop_api = $.Jcrop("#showface",{
                aspectRatio:1,
                handleSize:15
            });
            jcrop_api.setSelect([100,100,200,200]); 
        };
        $('#showface').attr('src',this.result);
    };
}

$(document).ready(function(){
    
    //按钮:切换到报名页面
    $("#bt_enter_page2").click(function(){
        $("#page2").show();
        $("#page1").hide();
    });
    
    //按钮:发送验证码
    $("#bt_send_authcode").click(function(){
        //校验:电话号码
        var phone=$.trim($('#phone').val());
        var message = verifyPhone(phone)
        if(message != "OK") 
        {
            alert(message);
            $('#phone').focus();
            return false;
        }
        //发送验证码
        sendAuthCode(phone)        
        
        //按钮倒计时
        $("#bt_send_authcode").disabled = true; //当点击后倒计时时候不能点击此按钮  
        var time = 60;                          //倒计时60秒  
        var timer = setInterval(fun1, 1000);    //设置定时器  
        function fun1() {
            time--;
            if(time>=0) {
                $("#bt_send_authcode").text(time + "s后重新发送");
                $("#bt_send_authcode").attr('disabled','disabled');
            }
            else{
                $("#bt_send_authcode").text("重新发送验证码");  
                $("#bt_send_authcode").removeAttr("disabled")
                clearTimeout(timer);            //清除定时器  
                time = 60;                      //设置循环重新开始条件  
            }  
        }
        
    });

    //注册按钮
    $("#bt_register").click(function(){

        //把必选项部分校验一下
        //校验:姓名
        var name=$.trim($('#name').val());
        var message = verifyName(name)
        if(message != "OK") 
        {
            alert(message);
            $('#name').focus();
            return false;
        }
        //校验:电话号码
        var phone=$.trim($('#phone').val());
        var message = verifyPhone(phone)
        if(message != "OK") 
        {
            alert(message);
            $('#phone').focus();
            return false;
        }
        //校验:验证码
        var authcode=$.trim($('#authcode').val());
        var message = verifyAuthCode(authcode)
        if(message != "OK") 
        {
            alert(message);
            $('#authcode').focus();
            return false;
        }
        //校验:邮箱
        var email=$.trim($('#email').val());
        var message = verifyEmail(email)
        if(message != "OK") 
        {
            alert(message);
            $('#email').focus();
            return false;
        }
        //校验:人脸图片
        if(target_face==null)
        {
            alert("请输入人脸图片");
            return false;
        }
        //切换到page3
        $("#page3").show();
        $("#page2").hide();

        //按照注册协议,往服务器发送给POST注册请求
        var xmlhttp = getHttpObj();  
        var regist_server_addr = $.trim($('#regist_server_addr').text())
        xmlhttp.open("POST","http://"+regist_server_addr+"/",true);
        //xmlhttp.open("POST","http://10.2.12.99:8000/",true);
        xmlhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;");//缺少这句，后台无法获取参数  
        xmlhttp.onreadystatechange=function()
        {
            if (xmlhttp.readyState==4 && xmlhttp.status==200)
            {
                //应答消息
                var jsonResponse = JSON.parse(xmlhttp.responseText);
                if(jsonResponse["DDIP"]["Header"]["ErrorNum"] != "200")
                {
                    $('#reg_message').text("报名失败!");
                    $('#reg_detail').text(jsonResponse["DDIP"]["Header"]["ErrorString"]);
                }
                else
                {
                    //创建二维码图片
                    $('#reg_message').text("报名成功!");
                    $('#reg_detail').text("二维码可用作签到凭证，请截屏保存此页面以备用");
                    jQuery('#qrcodeCanvas').qrcode({text:jsonResponse["DDIP"]["Body"]["QRCode"]});
                }
                //切换到page3
                //$("#page3").show();
                //$("#page2").hide();
            }
        }
        //---组织内容
        var jsonRequest =   {"DDIP": {
                                "Body": {
                                    "Project": "",
                                    "PhoneNumber": "",
                                    "AuthCode": "",
                                    "Picture":  "",
                                    "Name": "",
                                    "Email": ""
                                },
                                "Header": {
                                    "CSeq": "1",
                                    "MessageType": "MSG_REGISTER_REQ",
                                    "Version": "1.0"
                                }
                            }};
        jsonRequest["DDIP"]["Body"]["Project"] = $.trim($('#projectname').text());
        jsonRequest["DDIP"]["Body"]["PhoneNumber"] = $.trim($('#phone').val());
        jsonRequest["DDIP"]["Body"]["AuthCode"] = $.trim($('#authcode').val());
        jsonRequest["DDIP"]["Body"]["Name"] = $.trim($('#name').val());
        jsonRequest["DDIP"]["Body"]["Email"] = $.trim($('#email').val());

        //
        var canvas = document.getElementById('face'); 
        //alert("[debug]:canvas.width->"+canvas.width);
        //alert("[debug]:canvas.height->"+canvas.height);
        //在手机端下面的编码base64的头"data:image/png;base64"
        //但实际以指定的jpeg编码的
        var dataURL = canvas.toDataURL("image/jpeg");
        //alert(dataURL);
        var imgBase64 = dataURL.replace(/^data:image\/(png|jpeg);base64,/,"")
        //alert(imgBase64);
        jsonRequest["DDIP"]["Body"]["Picture"] = imgBase64;
        //发送注册请求
        var strRequest = JSON.stringify(jsonRequest);
        xmlhttp.send(strRequest);
    });
    
    //按钮:打开人脸选择对话框
    $("#bt_open_facedailog").click(function(){
        $("#page2").hide();
        $("#facedailog").show();
        $('#facefile').val(''); //清空选择的人脸文件
        $('#showface').attr('src',"image/face_demo.jpg");
        target_face = null
    });
    $("#bt_close_facedailog").click(function(){
        //清理现场
        if(jcrop_api != null){
            jcrop_api.destroy();
        }
        var image = document.getElementById('showface'); 
        if(image.onload != null){
            image.onload = null;  
        }
        $('#facefile').val(''); //清空选择的人脸文件
        $('#showface').attr('src',"image/face_demo.jpg");
        //切换页面
        $("#facedailog").hide();
        $("#page2").show();
    });
    $("#bt_apply_facedailog").click(function(){
        //对选择的图片进行压缩
        if(jcrop_api == null)
        {
            alert("请选择人脸图片"); 
            return false;
        }
        target_face = jcrop_api.tellSelect();
        
        var square = 128;   //定义画布的大小，也就是图片压缩之后的像素   
        var canvas = document.getElementById('face'); 
        canvas.width = square;  
        canvas.height = square;  
        var context = canvas.getContext('2d');
        context.clearRect(0, 0, square, square);  

        var image = document.getElementById('showface'); 
        var widgetSize = jcrop_api.getWidgetSize();
        
        //把坐标转成实际图像的坐标
        var aa = image.width/image.height;
        var bb = widgetSize[0]/widgetSize[1];
        var rotate90 = 0;   //原图坐标是旋转一下90度
        if ((aa-1)*(bb-1) < 0)
        {
            rotate90 = 1;
        }
        if(rotate90 == 0)
        {
            //以左上角为坐标原点，
            //0---------->X
            //|
            //|
            //Y
            var scaleX = image.width/widgetSize[0];
            var scaleY = image.height/widgetSize[1];
            var cropX = target_face.x * scaleX;
            var cropY = target_face.y * scaleY;
            var cropWidth = target_face.w * scaleX;
            var cropHeight = target_face.h * scaleY;  
            context.drawImage(image, cropX, cropY, cropWidth, cropHeight,0,0,square,square);
        }
        else
        {
            //以右上角为坐标原点，
            //Y<------0
            //        |
            //        |
            //        |
            //        |
            //        |
            //        X
            
            var scaleX = image.width/widgetSize[1];
            var scaleY = image.height/widgetSize[0];
            var cropX = target_face.y * scaleX;
            var cropY = (widgetSize[0]-(target_face.x+target_face.w)) * scaleY;
            var cropWidth = target_face.h * scaleX;
            var cropHeight = target_face.w * scaleY;  

            //选择90度
            context.save();                         //保存状态
            context.translate(square,0);       //设置画布上的(0,0)位置，也就是旋转的中心点
            context.rotate(90*Math.PI/180);
            context.drawImage(image, cropX, cropY, cropWidth, cropHeight,0,0,square,square);
            context.restore();//恢复状态
            /*
            alert("===rotate===");
            var info = "image.width="+image.width+" image.height="+image.height + " "
                +"widgetSize[0]="+widgetSize[0]+" widgetSize[1]="+widgetSize[1] + " "
                +"target_face.x="+target_face.x+" target_face.y="+target_face.y + " "
                +"target_face.w="+target_face.w+" target_face.h="+target_face.h + " "
                +"scaleX="+scaleX+" scaleY="+scaleY + " "
                +"cropX="+cropX+" cropY="+cropY + " "
                +"cropWidth="+cropWidth+" cropHeight="+cropHeight;
            alert(info);
            */
        }

        //清理现场
        if(jcrop_api != null){
            jcrop_api.destroy();
        }
        if(image.onload != null){
            image.onload = null;  
        }
        $('#facefile').val(''); //清空选择的人脸文件
        $('#showface').attr('src',"image/face_demo.jpg");
        //切换页面
        $("#page2").show();
        $("#facedailog").hide();
    });
    	
});

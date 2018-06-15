#!/usr/local/openresty/luajit/bin/luajit-2.1.0-alpha

-----------------代码规范说明-----------------
--[[
所有程序基本框架都是类似的
说明1>对错误应答的处理
	在processmsg函数中会调用各个处理分支，如果分支函数成功则其内部返回http应答
	如果返回失败，由processmsg判断返回值统一应答
说明2>对鉴权等常规共性的动作做好可以统一到脚本中去执行
说明3>HTTP应答头统一都是OK，这样便于查找是应用错误，还是系统错误
]]

--[设定搜索路径]
--将自定义包路径加入package的搜索路径中。也可以加到环境变量LUA_PATH中
--放到init_lus_path.lua中，不然的话，每一个请求处理的时候都会对全局变量
--package.path进行设置，导致

--[包含公共的模块]
local tableutils = require("common_lua.tableutils")		--打印工具
local cjson = require("cjson.safe")
local wanip_iresty = require("common_lua.wanip_iresty")
local http_iresty = require ("resty.http")
local redis_iresty = require("common_lua.redis_iresty")
local script_utils = require("common_lua.script_utils")
local template = require("resty.template")

--[基本变量参数]
local redis_ip = nil
local redis_port = 6379

function send_resp_string (resp_str)
	--HTTP应答头统一都是OK，这样便于查找是应用错误，还是系统错误
	ngx.header.content_length = string.len(resp_str)
	ngx.say(resp_str)
end

--从日期字符串中截取出年月日时分秒[0000-00-00 00:00:00]
local function string2time(timeString)  
    local Y = string.sub(timeString,1,4)  
    local M = string.sub(timeString,6,7)  
    local D = string.sub(timeString,9,10)  
    local H = string.sub(timeString,12,13)  
    local MM = string.sub(timeString,15,16)  
    local SS = string.sub(timeString,18,19)
    return os.time{year=Y,month=M, day=D, hour=H,min=MM,sec=SS}  
end

-- 写入文件
local function writefile(filename, info)
	print("writefile--------->",filename)
    local wfile=io.open(filename, "w") --写入文件(w覆盖)
    assert(wfile)  		--打开时验证是否出错
    wfile:write(info)  	--写入传入的内容
    wfile:close()  		--调用结束后记得关闭
end

--判断文件是否存在
local function file_exists(name)
    local f=io.open(name,"r")
    if f~=nil then io.close(f) return true else return false end
end

--消息处理函数入库
function process_msg()
	--从请求url中分离出项目名称
    --print(ngx.var.uri)
	--uri的格式如:(url=/项目名字.lua)
	local project_name = string.match(ngx.var.uri,"/(%w+).lua")
	if not project_name then
		ngx.log(ngx.ERR,"Invalid URI Format",ngx.var.uri)
        return send_resp_string("<p>Invalid URI Format</p>")
	end

    --对项目进行基本的校验(验证一下,项目是否存在，以及是否在有效期内)
    --创建redis操作句柄
    local opt = {["redis_ip"]=redis_ip,["redis_port"]=redis_port,["timeout"]=3}
	local red_handler = redis_iresty:new(opt)
	if not red_handler then
	    ngx.log(ngx.ERR, "redis_iresty:new red_handler failed")
        return send_resp_string("<p>redis_iresty:new red_handler failed</p>")
	end
    --获取项目信息
    local project_key = "project:"..project_name..":info"
    local project_info, err = red_handler:hmget(project_key,"RegisterBegin","RegisterEnd","CheckBegin","CheckEnd")
    if not project_info then
	    ngx.log(ngx.ERR, "get project info failed : ", project_key,err,redis_ip)
        return send_resp_string("<p>get project info failed</p>")
	end
    local register_begin = project_info[1]
    local register_end = project_info[2]
    local check_begin = project_info[3]
    local check_end = project_info[4]   
    
    --把项目的背景图片从Redis中下载下来
    local bg_picture_filename = "html/image/"..project_name..".jpg"
    if not file_exists(bg_picture_filename) then
		local project_bg_picture, err = red_handler:hget(project_key,"BgPicture")
        if not project_bg_picture then
            ngx.log(ngx.ERR, "get project_bg_picture failed : ", project_key,err,redis_ip)
            return send_resp_string("<p>get project_bg_picture failed</p>")
        end
        writefile(bg_picture_filename, ngx.decode_base64(project_bg_picture))
	end
    
    --获取该项目所有的注册信息
    local user_key_x = "project:"..project_name..":user:*"
    local user_lists, err = red_handler:keys(user_key_x)
    if not user_lists then
	    ngx.log(ngx.ERR, "get user_key_x failed : ", user_key_x,err)
        return send_resp_string("<p>get user_key_x failed</p>")
	end
    local register_num = #user_lists
    local check_num = 0
    local user_records = {}
    for i=1,#user_lists do
        --print(user_lists[i])
        local user_key = user_lists[i]
        local user_info, err = red_handler:hmget(user_key,"Status","Name","Email","RegisterTime","CheckTime","Other")
        if not user_info then
            ngx.log(ngx.ERR, "get user_info failed : ", user_key,err)
            return send_resp_string("<p>get user_info failed</p>")
        end

        local object = {}
        object["Status"] = user_info[1]
        object["Name"] = user_info[2]
        object["PhoneNumber"] = string.sub(user_key,string.len("project:"..project_name..":user:")+1)
        object["Email"] = user_info[3]
        object["RegisterTime"] = user_info[4]
        object["CheckTime"] = user_info[5]
        object["Other"] = user_info[6]
        if(object["Status"] == "Checked") then
            check_num = check_num + 1
        end
        --加入队列中
        user_records[i] = object
    end
    --tableutils.printTable(user_records)
    
    --将项目名字写入模板中进行返回输出
    --方式1:
    --template.render("project.html", { ProjectName = project_name })

    --方式2:编译得到一个lua函数
    local func = template.compile("project.html")  
    local content = func({ProjectName=project_name,
                        ProjectBgPicture="image/"..project_name..".jpg",
                        RegisterBegin=register_begin,
                        RegisterEnd=register_end,
                        CheckBegin=check_begin,
                        CheckEnd=check_end,
                        RegisterNum=register_num,
                        CheckNum=check_num,
                        UserRecords = user_records})
    send_resp_string(content)
	return
end

--加载配置信息(环境变量中配置)
local function load_config_info()
    --数据库地址
    redis_ip = ngx.shared.shared_data:get("RedisIP")
	if redis_ip == nil  then
		ngx.log(ngx.ERR,"get RedisIP failed ")
        return false
	end
	return true
end

--程序入口
--print("=====================new request=======================\n")
--print("get server_port::::",ngx.var.server_port,type(ngx.var.server_port))
-->status.xxxxxx.xxxx:8005|8105
if(ngx.var.server_port == "8005") or (ngx.var.server_port == "8105") then			
	local ok = load_config_info()
	if not ok then
		ngx.log(ngx.ERR,"load_config_info failed ")
		return false
	end
else
	ngx.log(ngx.ERR,"invlaid ngx.var.server_port",ngx.var.server_port)
	return false
end
process_msg()

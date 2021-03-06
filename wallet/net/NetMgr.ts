namespace BlackCat {
    export class NetMgr {

        private types: Array<number>; // 网络类型
        private nodes: any; // nel节点
        private apis: any; // api节点
        private clis: any; // cli节点

        private default_type: number; // 默认网络，1：主网；2:测试网

        type: number; // 当前网络
        private apis_server: string; // 当前api_server
        private nodes_server: any; // 当前nelnode_server
        private clis_server: any; // 当前neocli节点

        private node_change_tmp: any; // 选择node节点

        constructor() {
            this.types = [1, 2]

            this.apis = [
                // 调试服
                // ["CN", "https://blacat.9191wyx.com/apic/"],

                // 正式服
                ["CN", "//apip01.9191wyx.com/apic/"], // gateway
                ["HK", "//api01.blacat.org/apic/"],
            ]

            this.nodes = {}
            this.nodes[1] = [
                // 主网nelnode
                ["CN", "https://api.nel.group/api/mainnet", "_NEL"],

                ["CN", "https://mainnet-node-sz-01.9191wyx.com/api/mainnet", "_1"],

                ["HK", "https://mainnet_node_hk_01.blacat.org/api/mainnet", "_1"],
                ["HK", "https://mainnet_node_hk_02.blacat.org/api/mainnet", "_2"],
            ]
            this.nodes[2] = [
                // 测试网nelnode
                ["CN", "https://api.nel.group/api/testnet", "_NEL"],

                ["CN", "https://testnet-node-sz-01.9191wyx.com/api/testnet", "_1"],

                ["HK", "https://testnet_node_hk_01.blacat.org/api/testnet", "_1"],
                ["HK", "https://testnet_node_hk_02.blacat.org/api/testnet", "_2"],
            ]

            this.clis = {}
            this.clis[1] = [
                // 主网cli
                ["CN", 'https://clip01.9191wyx.com/api/mainnet'],  // gateway

                ["HK", 'https://neocli01.blacat.org/api/mainnet'],
            ]
            this.clis[2] = [
                // 测试网cli
            ]


            this.nodes_server = {}
            this.default_type = 1;
            this.clis_server = {}
        }

        // 选择后台接口访问地址
        selectApi(callback) {
            if (this.apis_server) {
                ApiTool.base_url = this.apis_server;
                callback()
                return
            }

            // 连接中...
            Main.viewMgr.change("ViewConnecting")
            ViewConnecting.callback_retry = () => {
                // 重试
                this._selectApi(callback)
            }
            this._selectApi(callback)
        }
        private _selectApi(callback) {
            Main.viewMgr.viewConnecting.showConnecting()
            Main.viewMgr.iconView.showState()
            var conn = new Connector(this.getHosts(this.apis), "apic_test.php", 'api')
            conn.getOne((res, response) => {
                if (res === false) {
                    // 失败提示
                    ViewConnecting.content = "netmgr_select_api_slow"
                    // 重试（返回）按钮
                    Main.viewMgr.viewConnecting.showRetry(false)
                    // 隐藏icon状态
                    Main.viewMgr.iconView.hiddenState()
                    // icon颜色（灰色）
                    if (Main.isLoginInit() === true) Main.viewMgr.iconView.showFail()
                    return
                }
                console.log("[BlaCat]", '[NetMgr]', 'api => ', res)
                console.log("[BlaCat]", '[NetMgr]', 'api response => ', response)
                this.apis_server = res + "apic_user.php"
                ApiTool.base_url = this.apis_server
                callback()
                // if (Main.viewMgr.viewConnecting.isCreated) Main.viewMgr.viewConnecting.remove()
            })
        }


        // 选择nelnode节点，使用这个后，必须再使用selectCli
        private selectNode(callback, type, force = 0) {
            if (force == 0 && this.nodes_server && this.nodes_server.hasOwnProperty(type) && this.nodes_server[type]) {
                // tools.WWW.api = this.node_server[type];
                this.node_change_tmp = this.nodes_server[type]
                // callback()
                this.selectCli(callback, type, force)
                return
            }

            // 连接中...
            Main.viewMgr.change("ViewConnecting")
            ViewConnecting.callback_retry = () => {
                // 重试
                this._selectNode(callback, type, force)
            }
            this._selectNode(callback, type, force)
        }

        private _selectNode(callback, type, force) {
            Main.viewMgr.viewConnecting.showConnecting()
            Main.viewMgr.iconView.showState()
            var conn = new Connector(this.getHosts(this.nodes[type]), "?jsonrpc=2.0&id=1&method=getblockcount&params=[]", 'node')
            conn.getOne((res, response) => {
                if (res === false) {
                    // 失败提示
                    ViewConnecting.content = "netmgr_select_node_slow"
                    // 重试（返回）按钮
                    var showReturn = !Main.isLoginInit()
                    Main.viewMgr.viewConnecting.showRetry(showReturn)
                    // 隐藏icon状态
                    Main.viewMgr.iconView.hiddenState()
                    // icon颜色（灰色）
                    if (Main.isLoginInit() === true) Main.viewMgr.iconView.showFail()
                    return
                }
                console.log("[BlaCat]", '[NetMgr]', 'node => ', res)
                console.log("[BlaCat]", '[NetMgr]', 'node response => ', response)


                // this.node_server[type] = res
                // tools.WWW.api = this.node_server[type]
                // callback()
                // if (Main.viewMgr.viewConnecting.isCreated) Main.viewMgr.viewConnecting.remove()
                // // 隐藏状态
                // Main.viewMgr.iconView.hiddenState()
                // // 显示正常
                // Main.viewMgr.iconView.showSucc()

                // 因为还需要选择cli节点，这里暂存一下结果
                this.node_change_tmp = res
                this.selectCli(callback, type, force)
            })
        }


        private selectCli(callback, type, force = 0) {

            if (!this.clis || !this.clis[type] || this.clis[type].length == 0) {
                // 没有NeoCli
                this.nodes_server[type] = this.node_change_tmp
                tools.WWW.api_nodes = this.nodes_server[type]

                this.clis_server[type] = null
                tools.WWW.api_clis = null
                callback()

                if (Main.viewMgr.viewConnecting.isCreated) Main.viewMgr.viewConnecting.remove()
                // 隐藏状态
                Main.viewMgr.iconView.hiddenState()
                // 显示正常
                Main.viewMgr.iconView.showSucc()

                return
            }

            if (force == 0 && this.clis_server && this.clis_server.hasOwnProperty(type) && this.clis_server[type]) {
                // 有NeoCli已经被选择了
                this.nodes_server[type] = this.node_change_tmp
                tools.WWW.api_nodes = this.nodes_server[type]

                tools.WWW.api_clis = this.clis_server[type]

                callback()

                if (Main.viewMgr.viewConnecting.isCreated) Main.viewMgr.viewConnecting.remove()
                // 隐藏状态
                Main.viewMgr.iconView.hiddenState()
                // 显示正常
                Main.viewMgr.iconView.showSucc()

                return
            }

            // 连接中...
            Main.viewMgr.change("ViewConnecting")
            ViewConnecting.callback_retry = () => {
                // 重试
                this._selectCli(callback, type)
            }
            this._selectCli(callback, type)
        }

        private _selectCli(callback, type) {
            Main.viewMgr.viewConnecting.showConnecting()
            Main.viewMgr.iconView.showState()
            var conn = new Connector(this.getHosts(this.clis[type]), "?jsonrpc=2.0&id=1&method=getblockcount&params=[]&uid=" + Main.randNumber, 'cli')
            conn.getOne((res, response) => {
                if (res === false) {
                    // 失败提示
                    ViewConnecting.content = "netmgr_select_cli_slow"
                    // 重试（返回）按钮
                    var showReturn = !Main.isLoginInit()
                    Main.viewMgr.viewConnecting.showRetry(showReturn)
                    // 隐藏icon状态
                    Main.viewMgr.iconView.hiddenState()
                    // icon颜色（灰色）
                    if (Main.isLoginInit() === true) Main.viewMgr.iconView.showFail()
                    return
                }
                console.log("[BlaCat]", '[NetMgr]', 'cli => ', res)
                console.log("[BlaCat]", '[NetMgr]', 'cli response => ', response)

                // cli也选择成功，可都修改参数了
                this.nodes_server[type] = this.node_change_tmp
                tools.WWW.api_nodes = this.nodes_server[type]

                this.clis_server[type] = res
                tools.WWW.api_clis = this.clis_server[type]

                callback()
                if (Main.viewMgr.viewConnecting.isCreated) Main.viewMgr.viewConnecting.remove()
                // 隐藏状态
                Main.viewMgr.iconView.hiddenState()
                // 显示正常
                Main.viewMgr.iconView.showSucc()
            })
        }


        // 选择/切换网络
        change(callback, type: number = null) {
            if (!type) {
                type = this.default_type;
            }
            if (this.type != type) {
                console.log("[BlaCat]", '[NetMgr]', 'change, type => ', type)
                switch (type) {
                    case 1: // 主网
                        this.change2Main(callback)
                        break;
                    case 2: // 测试网
                        this.change2test(callback)
                        break;
                }
            }
        }
        setDefault(type: number) {
            console.log("[BlaCat]", '[NetMgr]', 'setDefault, type => ', type)
            this.default_type = type;
        }



        private async change2test(callback) {
            // 节点地址
            this.selectNode(() => {
                // 测试网
                this.type = 2;
                // cgas合约地址、cgas旧合约地址
                tools.CoinTool.id_CGAS = "0x74f2dc36a68fdc4682034178eb2220729231db76";
                tools.CoinTool.id_CGAS_OLD = []
                // cgas协调退款地址
                tools.WWW.api_cgas = 'https://apiwallet.nel.group/api/testnet';

                // cneo合约地址、ceno旧合约地址
                tools.CoinTool.id_CNEO = "0xc074a05e9dcf0141cbe6b4b3475dd67baf4dcb60"
                tools.CoinTool.id_CNEO_OLD = []
                // cneo协调退款地址
                tools.WWW.api_cneo = '';

                // BCT
                tools.CoinTool.id_BCT = "0x40a80749ef62da6fc3d74dbf6fc7745148922372"
                tools.CoinTool.id_BCT_DESTROY = "AdsNmzKPPG7HfmQpacZ4ixbv9XJHJs2ACz"

                // BCP
                tools.CoinTool.id_BCP = "0x04e31cee0443bb916534dad2adf508458920e66d"

                // BTC-NEP5
                tools.CoinTool.id_BTC = "0x07bc2c1398e1a472f3841a00e7e7e02029b8b38b"
                tools.CoinTool.id_BTC_DESTROY = "AUWYsHRi1xv584DswcQKkz1UXJf8G3se4Y"

                // ETH-NEP5
                tools.CoinTool.id_ETH = "0x7c652b368ddc0fb035bb9c63eca91b2e3c55385e"
                tools.CoinTool.id_ETH_DESTROY = "AQN4ecUAEcX8Sce11e7eyWNRYPPbDv7rcZ"

                // CNEO
                tools.CoinTool.id_CNEO_DESTROY = "AcQLYjGbQU2bEQ8RKFXUcf8XvromfUQodq"

                // bancor合约地址
                tools.CoinTool.id_bancor = "0x0ca406aea638e0fed8580f00eb8b6e1dcb3d95da"

                // 购买VIP转账地址
                tools.CoinTool.BUY_VIP_ADDR = "AYkiQ74FHWFygR39WizXCz9f4xCLRYCxMT"

                // 回调
                callback()
            }, 2)
        }

        private async change2Main(callback) {
            // 节点地址
            this.selectNode(() => {
                // 主网
                this.type = 1;
                // cgas合约地址、cgas旧合约地址
                tools.CoinTool.id_CGAS = "0x74f2dc36a68fdc4682034178eb2220729231db76";
                tools.CoinTool.id_CGAS_OLD = []
                // cgas协调退款地址
                tools.WWW.api_cgas = 'https://apiwallet.nel.group/api/mainnet';

                // cneo合约地址、ceno旧合约地址
                tools.CoinTool.id_CNEO = "0xc074a05e9dcf0141cbe6b4b3475dd67baf4dcb60"
                tools.CoinTool.id_CNEO_OLD = []
                // cneo协调退款地址
                tools.WWW.api_cneo = '';

                // BCT
                tools.CoinTool.id_BCT = "0x40a80749ef62da6fc3d74dbf6fc7745148922372"
                tools.CoinTool.id_BCT_DESTROY = ""

                // BCP
                tools.CoinTool.id_BCP = "0x04e31cee0443bb916534dad2adf508458920e66d"

                // BTC-NEP5
                tools.CoinTool.id_BTC = ""
                tools.CoinTool.id_BTC_DESTROY = ""

                // ETH-NEP5
                tools.CoinTool.id_ETH = ""
                tools.CoinTool.id_ETH_DESTROY = ""

                // CNEO
                tools.CoinTool.id_CNEO_DESTROY = ""

                // bancor合约地址
                tools.CoinTool.id_bancor = ""

                // 购买VIP转账地址
                tools.CoinTool.BUY_VIP_ADDR = ""

                // 回调
                callback()
            }, 1)
        }

        getOtherTypes(): Array<number> {
            var res = new Array()
            for (let k = 0; k < this.types.length; k++) {
                if (this.types[k] !== this.type) {
                    res.push(this.types[k])
                }
            }
            return res;
        }

        private getHosts(hosts) {
            var res = []
            hosts.forEach(
                host => {
                    res.push(host[1])
                }
            )
            return res;
        }

        // 获取当前节点信息，type: clis，nodes
        getCurrNodeInfo(type: string) {
            var info = null
            if (this[type][this.type].length > 0) {
                for (let i = 0; i < this[type][this.type].length; i++) {
                    if (this[type][this.type][i][1] == this[type + "_server"][this.type]) {
                        return this[type][this.type][i]
                    }
                }
            }
            return info
        }

        getNodeLists(type: string) {
            var lists = []
            if (this[type] && this[type][this.type]) {
                return this[type][this.type]
            }
            return lists
        }

        setNode(type, url) {
            this[type + "_server"][this.type] = url
            tools.WWW["api_" + type] = url
        }
    }

}
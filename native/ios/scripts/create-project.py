#!/usr/bin/env python3
"""Generate the dependency-free Xcode project deterministically."""
import hashlib,json,pathlib
root=pathlib.Path(__file__).resolve().parents[1];objects={}
def uid(name):return hashlib.sha1(name.encode()).hexdigest()[:24].upper()
def obj(name,text):objects[uid(name)]=text;return uid(name)
def arr(ids):return '('+','.join(ids)+',)'
project=uid('project');groups=[];targets=[];products=[]
for name,kind in [('Fylogia','application'),('FylogiaTests','bundle.unit-test'),('FylogiaUITests','bundle.ui-testing')]:
 group=obj(name+'group',f'isa = PBXFileSystemSynchronizedRootGroup; path = {name}; explicitFolders = (WebAssets); sourceTree = "<group>";');groups.append(group)
 product=obj(name+'product',f'isa = PBXFileReference; explicitFileType = {"wrapper.application" if kind=="application" else "wrapper.cfbundle"}; path = {name}{".app" if kind=="application" else ".xctest"}; sourceTree = BUILT_PRODUCTS_DIR;');products.append(product)
 phases=[obj(name+p,f'isa = PBX{p}BuildPhase; buildActionMask = 2147483647; files = (); runOnlyForDeploymentPostprocessing = 0;') for p in ['Sources','Frameworks','Resources']]
 configs=[]
 for config in ['Debug','Release']:
  settings={'PRODUCT_NAME':'"$(TARGET_NAME)"','PRODUCT_BUNDLE_IDENTIFIER':'com.fylogia.native'+('' if name=='Fylogia' else '.'+name),'GENERATE_INFOPLIST_FILE':'YES','SWIFT_VERSION':'5.0','TARGETED_DEVICE_FAMILY':'"1,2"','IPHONEOS_DEPLOYMENT_TARGET':'17.0','SDKROOT':'iphoneos','CODE_SIGN_STYLE':'Automatic','SWIFT_OPTIMIZATION_LEVEL':'"-Onone"' if config=='Debug' else '"-O"','ENABLE_TESTABILITY':'YES','SUPPORTED_PLATFORMS':'"iphoneos iphonesimulator"'}
  if name=='Fylogia':settings.update({'INFOPLIST_KEY_UILaunchScreen_Generation':'YES','INFOPLIST_KEY_UIApplicationSceneManifest_Generation':'YES','INFOPLIST_KEY_UISupportedInterfaceOrientations':'"UIInterfaceOrientationPortrait UIInterfaceOrientationPortraitUpsideDown UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight"','INFOPLIST_KEY_CFBundleDisplayName':'Fylogia','ASSETCATALOG_COMPILER_APPICON_NAME':'AppIcon','MARKETING_VERSION':'0.1.0','CURRENT_PROJECT_VERSION':'1'})
  elif name=='FylogiaTests':settings.update({'TEST_HOST':'"$(BUILT_PRODUCTS_DIR)/Fylogia.app/$(BUNDLE_EXECUTABLE_FOLDER_PATH)/Fylogia"','BUNDLE_LOADER':'"$(TEST_HOST)"'})
  else:settings['TEST_TARGET_NAME']='Fylogia'
  configs.append(obj(name+config,'isa = XCBuildConfiguration; name = '+config+'; buildSettings = {'+''.join(f'{k} = {v};' for k,v in settings.items())+'};'))
 cl=obj(name+'configs','isa = XCConfigurationList; buildConfigurations = '+arr(configs)+'; defaultConfigurationIsVisible = 0; defaultConfigurationName = Release;')
 deps=[]
 if name!='Fylogia':
  proxy=obj(name+'proxy',f'isa = PBXContainerItemProxy; containerPortal = {project}; proxyType = 1; remoteGlobalIDString = {uid("Fylogiatarget")}; remoteInfo = Fylogia;')
  deps=[obj(name+'dependency',f'isa = PBXTargetDependency; target = {uid("Fylogiatarget")}; targetProxy = {proxy};')]
 targets.append(obj(name+'target',f'isa = PBXNativeTarget; name = {name}; productName = {name}; productReference = {product}; productType = "com.apple.product-type.{kind}"; buildConfigurationList = {cl}; buildPhases = {arr(phases)}; buildRules = (); dependencies = {arr(deps) if deps else "()"}; fileSystemSynchronizedGroups = {arr([group])};'))
pg=obj('products','isa = PBXGroup; name = Products; children = '+arr(products)+'; sourceTree = "<group>";')
mg=obj('main','isa = PBXGroup; children = '+arr(groups+[pg])+'; sourceTree = "<group>";')
configs=[obj('project'+c,'isa = XCBuildConfiguration; name = '+c+'; buildSettings = {CLANG_ENABLE_MODULES = YES; CLANG_ENABLE_OBJC_ARC = YES; SWIFT_STRICT_CONCURRENCY = targeted;};') for c in ['Debug','Release']]
cl=obj('projectconfigs','isa = XCConfigurationList; buildConfigurations = '+arr(configs)+'; defaultConfigurationIsVisible = 0; defaultConfigurationName = Release;')
obj('project',f'isa = PBXProject; attributes = {{LastUpgradeCheck = 1600;}}; buildConfigurationList = {cl}; compatibilityVersion = "Xcode 16.0"; developmentRegion = en; knownRegions = (en,Base); mainGroup = {mg}; productRefGroup = {pg}; projectDirPath = ""; projectRoot = ""; targets = {arr(targets)};')
out=root/'Fylogia.xcodeproj';out.mkdir(exist_ok=True)
(out/'project.pbxproj').write_text('// !$*UTF8*$!\n{ archiveVersion = 1; classes = {}; objectVersion = 77; objects = {\n'+''.join(k+' = {'+v+'};\n' for k,v in objects.items())+'}; rootObject = '+project+'; }\n')
def ref(name):return f'<BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{uid(name+"target")}" BuildableName="{name}{".app" if name=="Fylogia" else ".xctest"}" BlueprintName="{name}" ReferencedContainer="container:Fylogia.xcodeproj"/>'
scheme=out/'xcshareddata/xcschemes';scheme.mkdir(parents=True,exist_ok=True)
(scheme/'Fylogia.xcscheme').write_text('<?xml version="1.0" encoding="UTF-8"?><Scheme LastUpgradeVersion="1600" version="1.3"><BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES"><BuildActionEntries><BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES">'+ref('Fylogia')+'</BuildActionEntry></BuildActionEntries></BuildAction><TestAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" shouldUseLaunchSchemeArgsEnv="YES"><Testables>'+''.join('<TestableReference skipped="NO">'+ref(n)+'</TestableReference>' for n in ['FylogiaTests','FylogiaUITests'])+'</Testables></TestAction><LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugDocumentVersioning="YES" debugServiceExtension="internal" allowLocationSimulation="YES"><BuildableProductRunnable runnableDebuggingMode="0">'+ref('Fylogia')+'</BuildableProductRunnable></LaunchAction><ProfileAction buildConfiguration="Release" shouldUseLaunchSchemeArgsEnv="YES" savedToolIdentifier="" useCustomWorkingDirectory="NO" debugDocumentVersioning="YES"><BuildableProductRunnable runnableDebuggingMode="0">'+ref('Fylogia')+'</BuildableProductRunnable></ProfileAction><AnalyzeAction buildConfiguration="Debug"/><ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES"/></Scheme>')
